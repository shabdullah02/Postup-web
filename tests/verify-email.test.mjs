import assert from "node:assert/strict"
import { test } from "node:test"
import { resendVerification, verifyEmail } from "../lib/api.ts"

test("email verification uses the configured API URL and sends the token", async (context) => {
  const originalFetch = globalThis.fetch
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL
  const originalDocument = globalThis.document
  const originalWindow = globalThis.window
  const requests = []
  const events = []
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.test"
  globalThis.document = { cookie: "postup_csrftoken=test-csrf" }
  globalThis.window = { dispatchEvent: (event) => events.push(event) }
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init })
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }
  context.after(() => {
    globalThis.fetch = originalFetch
    globalThis.document = originalDocument
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
    if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL
    else process.env.NEXT_PUBLIC_API_URL = originalApiUrl
  })

  await verifyEmail({ token: "single-use-token" })
  await resendVerification()

  assert.equal(requests[0].url, "https://api.example.test/api/auth/verify-email/")
  assert.equal(requests[0].init.method, "POST")
  assert.deepEqual(JSON.parse(requests[0].init.body), { token: "single-use-token" })
  assert.equal(requests[0].init.credentials, "include")
  assert.equal(requests[0].init.headers.get("X-CSRFToken"), "test-csrf")
  assert.equal(events[0].type, "postup:email-verified")
  assert.equal(requests[1].url, "https://api.example.test/api/auth/resend-verification/")
  assert.equal(requests[1].init.method, "POST")
})
