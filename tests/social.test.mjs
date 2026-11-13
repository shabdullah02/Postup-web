import assert from "node:assert/strict"
import { test } from "node:test"
import {
  accountReauthWarning,
  canEditPost,
  facebookErrors,
  instagramImageValidationError,
  localDateTimeToIsoWithOffset,
  postStatusLabel,
  providerLabel,
  threadsErrors,
} from "../lib/social.ts"
import {
  listPendingSocialAccounts,
  publishPostNow,
  schedulePost,
  selectSocialAccounts,
  threadsConnectUrl,
} from "../lib/api.ts"

const account = (provider, status = "active") => ({
  id: 14,
  provider,
  external_id: "external",
  name: "Test account",
  status,
  scopes: "",
  connected_at: "2026-01-01T00:00:00Z",
})

const post = (status) => ({
  id: 1,
  account: 14,
  content: "Post",
  image_url: null,
  scheduled_at: null,
  status,
  error: null,
  external_post_id: null,
  permalink_url: null,
  posted_at: null,
  created_at: "2026-01-01T00:00:00Z",
})

test("provider badge labels are correct", () => {
  assert.equal(providerLabel("facebook"), "Facebook")
  assert.equal(providerLabel("instagram"), "Instagram")
  assert.equal(providerLabel("threads"), "Threads")
})

test("needs_reauth account has a scheduled-post warning", () => {
  assert.match(accountReauthWarning(account("facebook", "needs_reauth")), /scheduled posts.*fail/i)
  assert.equal(accountReauthWarning(account("instagram")), null)
})

test("every documented Facebook callback error has a user-facing message", () => {
  const expectedCodes = [
    "facebook_denied",
    "invalid_state",
    "missing_code",
    "facebook_unavailable",
    "permissions_declined",
    "no_pages",
    "no_instagram_accounts",
    "page_not_available",
  ]
  for (const code of expectedCodes) {
    assert.equal(typeof facebookErrors[code], "string", `${code} is mapped`)
    assert.ok(facebookErrors[code].length > 0)
  }
})

test("Threads connection errors have clear user-facing messages", () => {
  for (const code of ["expired_token", "invalid_token", "not_connected"]) {
    assert.ok(threadsErrors[code], `${code} is mapped`)
  }
})

test("Threads connect URL navigates directly to the Threads connect endpoint", (context) => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.test"
  context.after(() => {
    if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL
    else process.env.NEXT_PUBLIC_API_URL = originalApiUrl
  })

  assert.equal(threadsConnectUrl(), "https://api.example.test/api/socials/threads/connect/")
})

test("pending account selection uses the mock API transport", async (context) => {
  const originalFetch = globalThis.fetch
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL
  const originalDocument = globalThis.document
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.test"
  globalThis.document = { cookie: "postup_csrftoken=test-csrf" }
  const requests = []
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init })
    return new Response(JSON.stringify([{ id: "42", name: "Insta account" }]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }
  context.after(() => {
    globalThis.fetch = originalFetch
    globalThis.document = originalDocument
    if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL
    else process.env.NEXT_PUBLIC_API_URL = originalApiUrl
  })

  assert.deepEqual(await listPendingSocialAccounts(), [{ id: "42", name: "Insta account" }])
  await selectSocialAccounts(["42"])
  assert.equal(requests[1].url, "https://api.example.test/api/auth/connect/facebook/select/")
  assert.equal(requests[1].init.method, "POST")
  assert.deepEqual(JSON.parse(requests[1].init.body), { page_ids: ["42"] })

  process.env.TZ = "Asia/Karachi"
  const scheduledAt = localDateTimeToIsoWithOffset("2026-08-20T12:30")
  await schedulePost(9, scheduledAt)
  assert.equal(requests[2].url, "https://api.example.test/api/posts/9/schedule/")
  assert.deepEqual(JSON.parse(requests[2].init.body), { scheduled_at: "2026-08-20T12:30:00.000+05:00" })
  await publishPostNow(10)
  assert.equal(requests[3].url, "https://api.example.test/api/posts/10/publish_now/")
  assert.equal(requests[3].init.method, "POST")
  assert.equal(requests[3].init.credentials, "include")
  assert.equal(requests[3].init.headers.get("X-CSRFToken"), "test-csrf")
})

test("Instagram scheduling requires an absolute HTTPS image URL", () => {
  assert.match(instagramImageValidationError("instagram", ""), /require an image/i)
  assert.match(instagramImageValidationError("instagram", "/image.jpg"), /absolute HTTPS/i)
  assert.match(instagramImageValidationError("instagram", "http://example.test/image.jpg"), /absolute HTTPS/i)
  assert.equal(instagramImageValidationError("instagram", "https://example.test/image.jpg"), "")
  assert.equal(instagramImageValidationError("facebook", ""), "")
})

test("only drafts and scheduled posts are editable; deleted posts have a distinct label", () => {
  assert.equal(canEditPost(post("draft")), true)
  assert.equal(canEditPost(post("scheduled")), true)
  assert.equal(canEditPost(post("posted")), false)
  assert.equal(canEditPost(post("failed")), false)
  assert.equal(canEditPost(post("deleted_on_facebook")), false)
  assert.equal(postStatusLabel("deleted_on_facebook"), "Deleted on Facebook")
})

test("schedule ISO string retains the user's Asia/Karachi UTC+05:00 offset", () => {
  process.env.TZ = "Asia/Karachi"
  assert.equal(localDateTimeToIsoWithOffset("2026-08-20T12:30"), "2026-08-20T12:30:00.000+05:00")
  assert.equal(localDateTimeToIsoWithOffset("invalid"), null)
})
