import assert from "node:assert/strict"
import { test } from "node:test"
import {
  getAnalyticsOverview,
  listAnalyticsAccounts,
  listAnalyticsPosts,
} from "../lib/api.ts"

test("analytics API helpers use the documented account, range, and post endpoints", async (context) => {
  const originalFetch = globalThis.fetch
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL
  const requests = []
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.test"
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init })
    if (String(url).endsWith("/api/social-accounts/")) {
      return Response.json([{ id: 8, provider: "facebook", name: "Example page" }])
    }
    if (String(url).includes("/api/analytics/overview/")) {
      return Response.json({
        range: "7d",
        totals: { views: 12, reach: null, engagements: 3, follows: 1, unfollows: 0, followers_total: 40 },
        series: {},
        unavailable: [],
      })
    }
    return Response.json([])
  }
  context.after(() => {
    globalThis.fetch = originalFetch
    if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL
    else process.env.NEXT_PUBLIC_API_URL = originalApiUrl
  })

  const accounts = await listAnalyticsAccounts()
  const overview = await getAnalyticsOverview(8, 28)
  const posts = await listAnalyticsPosts(8)

  assert.equal(accounts[0].id, 8)
  assert.equal(overview.totals.views, 12)
  assert.deepEqual(posts, [])
  assert.equal(requests[0].url, "https://api.example.test/api/social-accounts/")
  assert.equal(requests[1].url, "https://api.example.test/api/analytics/overview/?account=8&days=28")
  assert.equal(requests[2].url, "https://api.example.test/api/analytics/posts/?account=8")
  assert.ok(requests.every(({ init }) => init.credentials === "include"))
})

test("analytics errors preserve the backend error code for page-specific states", async (context) => {
  const originalFetch = globalThis.fetch
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.test"
  globalThis.fetch = async () => Response.json({
    detail: "Reconnect this account.",
    code: "needs_reauth",
  }, { status: 401 })
  context.after(() => {
    globalThis.fetch = originalFetch
    if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL
    else process.env.NEXT_PUBLIC_API_URL = originalApiUrl
  })

  await assert.rejects(getAnalyticsOverview(8, 7), (error) => error.code === "needs_reauth")
})
