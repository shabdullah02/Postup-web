import assert from "node:assert/strict"
import { test } from "node:test"
import {
  getAnalyticsOverview,
  listAnalyticsAccounts,
  listAnalyticsPosts,
} from "../lib/api.ts"
import { buildAnalyticsChartPoints } from "../lib/analytics-chart.ts"

const dates = [
  "2026-10-31",
  "2026-11-01",
  "2026-11-02",
  "2026-11-03",
  "2026-11-04",
  "2026-11-05",
  "2026-11-06",
]

function overviewWithSeries({ follows, unfollows, followersTotal }) {
  return {
    range: { since: dates[0], until: dates.at(-1), days: 7 },
    totals: {
      views: null,
      reach: null,
      engagements: 0,
      follows: 0,
      unfollows: 0,
      followers_total: 2,
    },
    series: {
      views: null,
      follows: follows.map((value, index) => ({ date: dates[index], value })),
      unfollows: unfollows.map((value, index) => ({ date: dates[index], value })),
      followers_total: followersTotal.map((value, index) => ({ date: dates[index], value })),
    },
    unavailable: [
      { key: "views", metric: "page_posts_impressions", code: "metric_unavailable" },
      { key: "reach", metric: "page_posts_impressions_unique", code: "metric_unavailable" },
    ],
  }
}

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

test("repeated follower totals and zero net changes do not fabricate flat history", () => {
  const overview = overviewWithSeries({
    follows: [0, 0, 0, 0, 0, 0, 0],
    unfollows: [0, 0, 0, 0, 0, 0, 0],
    followersTotal: [2, 2, 2, 2, 2, 2, 2],
  })

  const points = buildAnalyticsChartPoints(overview)
  assert.deepEqual(points.map(({ netChange }) => netChange), [0, 0, 0, 0, 0, 0, 0])
  assert.deepEqual(points.map(({ followers }) => followers), [null, null, null, null, null, null, null])
})

test("daily net changes reconstruct follower history from the current total", () => {
  const overview = overviewWithSeries({
    follows: [0, 0, 0, 0, 0, 0, 2],
    unfollows: [0, 0, 0, 0, 0, 0, 0],
    followersTotal: [2, 2, 2, 2, 2, 2, 2],
  })

  const points = buildAnalyticsChartPoints(overview)
  assert.deepEqual(points.map(({ netChange }) => netChange), [0, 0, 0, 0, 0, 0, 2])
  assert.deepEqual(points.map(({ followers }) => followers), [0, 0, 0, 0, 0, 0, 2])
})

test("missing daily values remain null and prevent follower-history reconstruction", () => {
  const overview = overviewWithSeries({
    follows: [0, 0, 0, null, 0, 0, 2],
    unfollows: [0, 0, 0, 0, 0, 0, 0],
    followersTotal: [2, 2, 2, 2, 2, 2, 2],
  })

  const points = buildAnalyticsChartPoints(overview)
  assert.equal(points[3].netChange, null)
  assert.ok(points.every(({ followers }) => followers === null))
})
