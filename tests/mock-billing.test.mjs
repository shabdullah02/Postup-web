import assert from "node:assert/strict"
import { test } from "node:test"
import {
  cardBrand,
  formatCardExpiry,
  formatCardNumber,
  validateMockCard,
} from "../lib/mock-billing.ts"
import { billingApi, deleteAccount } from "../lib/api.ts"

test("mock card entry formats card number and expiry as the user types", () => {
  assert.equal(formatCardNumber("4242 4242 4242 4242 1234"), "4242 4242 4242 4242 123")
  assert.equal(formatCardExpiry("0828"), "08/28")
  assert.equal(cardBrand("3714 4963 5398 431"), "American Express")
})

test("mock card validation reports invalid number, expiry, CVV, and name", () => {
  const errors = validateMockCard({
    cardNumber: "4242 4242 4242 4241",
    expiry: "13/20",
    cvv: "12",
    name: " ",
  }, new Date("2026-01-01T00:00:00Z"))

  assert.equal(errors.cardNumber, "Enter a valid card number.")
  assert.equal(errors.expiry, "Enter a valid expiry month.")
  assert.equal(errors.cvv, "Enter a 3-digit security code.")
  assert.equal(errors.name, "Enter the name on the card.")
})

test("mock card validation accepts a valid unexpired card", () => {
  const errors = validateMockCard({
    cardNumber: "4242 4242 4242 4242",
    expiry: "08/28",
    cvv: "123",
    name: "Test User",
  }, new Date("2026-01-01T00:00:00Z"))

  assert.deepEqual(errors, {})
})

test("mock billing calls use the payment method and mock subscribe endpoints", async (context) => {
  const originalFetch = globalThis.fetch
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL
  const originalDocument = globalThis.document
  const requests = []
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.test"
  globalThis.document = { cookie: "postup_csrftoken=test-csrf" }
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init })
    return new Response(JSON.stringify(requests.length === 1
      ? { brand: "Visa", last4: "4242", exp_month: 8, exp_year: 2028 }
      : { ok: true }), {
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

  const paymentMethod = await billingApi.getPaymentMethod()
  await billingApi.mockSubscribe({
    plan: "pro",
    card_number: "4242424242424242",
    exp_month: 8,
    exp_year: 2028,
    cvv: "123",
  })

  assert.deepEqual(paymentMethod, { brand: "Visa", last4: "4242", exp_month: 8, exp_year: 2028 })
  assert.equal(requests[0].url, "https://api.example.test/api/billing/payment-method/")
  assert.equal(requests[1].url, "https://api.example.test/api/billing/mock-subscribe/")
  assert.deepEqual(JSON.parse(requests[1].init.body), {
    plan: "pro",
    card_number: "4242424242424242",
    exp_month: 8,
    exp_year: 2028,
    cvv: "123",
  })
  assert.equal(requests[1].init.headers.get("X-CSRFToken"), "test-csrf")
})

test("missing payment methods return an empty state while other errors are preserved", async (context) => {
  const originalFetch = globalThis.fetch
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.test"
  globalThis.fetch = async () => new Response("Not found.", { status: 404 })
  context.after(() => {
    globalThis.fetch = originalFetch
    if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL
    else process.env.NEXT_PUBLIC_API_URL = originalApiUrl
  })

  assert.equal(await billingApi.getPaymentMethod(), null)

  globalThis.fetch = async () => new Response("Unavailable.", { status: 503 })
  await assert.rejects(billingApi.getPaymentMethod(), (error) => error.status === 503)
})

test("missing and empty billing responses use empty states", async (context) => {
  const originalFetch = globalThis.fetch
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.test"
  const responses = [
    new Response("Not found.", { status: 404 }),
    new Response("[]", { status: 200 }),
    new Response("null", { status: 200 }),
    new Response(null, { status: 204 }),
    new Response(JSON.stringify({ results: [] }), { status: 200 }),
    new Response("Not found.", { status: 404 }),
    new Response(null, { status: 204 }),
    new Response("[]", { status: 200 }),
  ]
  globalThis.fetch = async () => responses.shift()
  context.after(() => {
    globalThis.fetch = originalFetch
    if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL
    else process.env.NEXT_PUBLIC_API_URL = originalApiUrl
  })

  assert.equal(await billingApi.getSubscription(), null)
  assert.equal(await billingApi.getSubscription(), null)
  assert.equal(await billingApi.getSubscription(), null)
  assert.deepEqual(await billingApi.listInvoices(), [])
  assert.deepEqual(await billingApi.listInvoices(), [])
  assert.deepEqual(await billingApi.listInvoices(), [])
  assert.equal(await billingApi.getPaymentMethod(), null)
  assert.equal(await billingApi.getPaymentMethod(), null)
})

test("billing request errors include readable development diagnostics", async (context) => {
  const originalFetch = globalThis.fetch
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL
  const originalNodeEnv = process.env.NODE_ENV
  const originalDocument = globalThis.document
  const originalWarn = console.warn
  const originalError = console.error
  const warnings = []
  const errors = []
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.test"
  process.env.NODE_ENV = "development"
  globalThis.document = { cookie: "postup_csrftoken=test-csrf" }
  console.warn = (...args) => warnings.push(args)
  console.error = (...args) => errors.push(args)
  globalThis.fetch = async () => new Response(JSON.stringify({
    detail: "This card number is not supported.",
    code: "payment_failed",
    errors: {},
  }), { status: 400 })
  context.after(() => {
    globalThis.fetch = originalFetch
    globalThis.document = originalDocument
    console.warn = originalWarn
    console.error = originalError
    if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL
    else process.env.NEXT_PUBLIC_API_URL = originalApiUrl
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
  })

  await assert.rejects(
    billingApi.mockSubscribe({
      plan: "pro",
      card_number: "4242424242424242",
      exp_month: 8,
      exp_year: 2028,
      cvv: "123",
    }),
    (error) => error.status === 400 && error.message === "This card number is not supported."
  )

  assert.equal(warnings.length, 1)
  assert.deepEqual(warnings[0], [
    "API request failed.",
    "URL:",
    "https://api.example.test/api/billing/mock-subscribe/",
    "Status:",
    400,
    "Response body:",
    JSON.stringify({
      detail: "This card number is not supported.",
      code: "payment_failed",
      errors: {},
    }),
  ])
  assert.equal(errors.length, 0)
})

test("deleteAccount sends DELETE and surfaces a conflict detail", async (context) => {
  const originalFetch = globalThis.fetch
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL
  const originalDocument = globalThis.document
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.test"
  globalThis.document = { cookie: "postup_csrftoken=test-csrf" }
  const requests = []
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init })
    return new Response(JSON.stringify({ detail: "Disconnect scheduled posts first." }), { status: 409 })
  }
  context.after(() => {
    globalThis.fetch = originalFetch
    globalThis.document = originalDocument
    if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL
    else process.env.NEXT_PUBLIC_API_URL = originalApiUrl
  })

  await assert.rejects(
    deleteAccount(42),
    (error) => error instanceof Error && error.message === "Disconnect scheduled posts first."
  )

  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, "https://api.example.test/api/accounts/42/")
  assert.equal(requests[0].init.method, "DELETE")
  assert.equal(requests[0].init.headers.get("X-CSRFToken"), "test-csrf")
})
