import type {
  AdminSubscriptionUpdateRequest,
  AdminUser as ContractAdminUser,
  AdminUserDetail as ContractAdminUserDetail,
  AdminUserPage as ContractAdminUserPage,
  AdminUserActionResponse,
  ApiErrorResponse,
  AnalyticsOverview,
  AnalyticsPost,
  AuthIdentity,
  AuditLogPage,
  AuthUser,
  BillingSummary as ContractBillingSummary,
  ChangePasswordRequest,
  ChangePlanRequest,
  CheckoutRequest,
  DeleteAccountRequest,
  DisableTwoFactorRequest,
  Invoice,
  LoginResponse,
  MockSubscribeRequest,
  OkResponse,
  PasswordResetConfirmRequest,
  PaymentMethod,
  PasswordResetRequest,
  Plan,
  Profile,
  RecoveryCodesResponse,
  RedirectResponse,
  RegisterResponse,
  RegenerateRecoveryCodesRequest,
  Session,
  SocialAccount,
  SocialProvider,
  Subscription,
  VerifyEmailRequest,
  TwoFactorLoginRequest,
  TwoFactorSetupResponse,
  UpdateProfileRequest,
} from "./api-types"

export type ApiErrorPayload = Partial<ApiErrorResponse> & {
  detail?: unknown
  code?: string
  [key: string]: unknown
}

export class ApiError extends Error {
  status: number
  code?: string
  field?: string
  payload?: ApiErrorPayload
  fieldErrors?: Record<string, string[]>

  constructor(
    message: string,
    status: number,
    code?: string,
    field?: string,
    payload?: ApiErrorPayload,
    fieldErrors?: Record<string, string[]>
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.field = field
    this.payload = payload
    this.fieldErrors = fieldErrors
  }
}

function getApiBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL is not defined")
  return apiUrl
}

function readCookie(name: string): string | undefined {
  const matches = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie.startsWith(`${name}=`))
  const last = matches[matches.length - 1]
  return last ? decodeURIComponent(last.slice(name.length + 1)) : undefined
}

async function getCsrfToken(apiUrl: string): Promise<string | undefined> {
  let token = readCookie("postup_csrftoken")
  if (!token) {
    await fetch(`${apiUrl}/api/auth/csrf/`, { credentials: "include" })
    token = readCookie("postup_csrftoken")
  }
  return token
}

function validationFieldErrors(detail: unknown): Record<string, string[]> {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return {}
  return Object.fromEntries(
    Object.entries(detail).map(([field, value]) => [
      field,
      (Array.isArray(value) ? value : [value]).map(String),
    ])
  )
}

function dispatchApiMessage(code: string | undefined, message: string, fieldErrors: Record<string, string[]>): void {
  if (typeof window === "undefined") return

  if (code === "plan_limit") {
    window.dispatchEvent(new CustomEvent("postup:plan-limit", { detail: message }))
    return
  }
  if (code === "email_not_verified") {
    window.dispatchEvent(new CustomEvent("postup:verification-required", { detail: message }))
    return
  }

  const mappedMessage = code === "throttled"
    ? "Too many attempts, try later"
    : code === "protected_user"
      ? message || "This user is protected and cannot be changed."
      : message
  window.dispatchEvent(new CustomEvent("postup:api-message", {
    detail: { code, message: mappedMessage, fieldErrors },
  }))
}

async function endAccountSession(apiUrl: string, message: string): Promise<void> {
  try {
    const csrfToken = await getCsrfToken(apiUrl)
    const headers = new Headers()
    if (csrfToken) headers.set("X-CSRFToken", csrfToken)
    await fetch(`${apiUrl}/api/auth/logout/`, {
      method: "POST",
      credentials: "include",
      headers,
    })
  } catch {
    // The failed request still invalidates local auth state below.
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("postup:session-ended", { detail: message }))
    window.dispatchEvent(new CustomEvent("postup:api-message", {
      detail: { code: "account_status", message, fieldErrors: {} },
    }))
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const apiUrl = getApiBaseUrl()
  const url = `${apiUrl}${path}`

  const method = init.method?.toUpperCase() ?? "GET"
  const headers = new Headers(init.headers)

  headers.set("Content-Type", "application/json")

  let response: Response
  try {
    if (["POST", "PATCH", "DELETE"].includes(method)) {
      const csrftoken = await getCsrfToken(apiUrl)
      if (!csrftoken) throw new Error("Unable to obtain the CSRF token")
      headers.set("X-CSRFToken", csrftoken)
    }

    response = await fetch(url, {
      ...init,
      credentials: "include",
      headers,
    })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("API request failed.", {
        url,
        status: null,
        responseBody: null,
        error,
      })
    }
    throw error
  }

  if (!response.ok) {
    const text = await response.text()
    let payload: ApiErrorPayload | undefined
    let message = ""
    let code: string | undefined
    let field: string | undefined
    let fieldErrors: Record<string, string[]> = {}
    try {
      const parsed: unknown = JSON.parse(text)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const data = parsed as ApiErrorPayload
        payload = data
        if (typeof data.detail === "string") message = data.detail
        else if (Array.isArray(data.detail)) message = data.detail.join(" ")
        else message = Object.values(data).flat().filter((value) => typeof value === "string").join(" ")
        code = typeof data.code === "string" ? data.code : undefined
        field = typeof data.field === "string" ? data.field : undefined
        if (code === "validation_error") fieldErrors = validationFieldErrors(data.detail)
      }
    } catch {
      payload = undefined
    }

    if (process.env.NODE_ENV === "development"
      && !(response.status === 403 && code === "missing_permission")) {
      const logFailure = response.status >= 500 ? console.error : console.warn
      logFailure(
        "API request failed.",
        "URL:",
        url,
        "Status:",
        response.status,
        "Response body:",
        text
      )
    }

    let errorMessage = message || `Request failed (${response.status}). Please try again.`
    if (code === "throttled") errorMessage = "Too many attempts, try later"
    if (code === "billing_unavailable") errorMessage = "Payments are not configured."
    if (code === "protected_user" && !message) errorMessage = "This user is protected and cannot be changed."

    if (code === "account_suspended" || code === "account_deactivated") {
      await endAccountSession(apiUrl, errorMessage)
    } else {
      dispatchApiMessage(code, errorMessage, fieldErrors)
    }

    throw new ApiError(errorMessage, response.status, code, field, payload, fieldErrors)
  }

  return response
}

export type Account = {
  id: number
  provider: SocialProvider
  external_id: string
  name: string
  username?: string | null
  avatar_url?: string | null
  profile_picture_url?: string | null
  threads_profile_picture_url?: string | null
  status: "active" | "needs_reauth" | "disconnected"
  scopes: string
  connected_at: string
}

function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results
}

export async function getAccounts(): Promise<Account[]> {
  return unwrap(await (await apiFetch("/api/auth/social-accounts/")).json())
}

export function facebookConnectUrl(reconnectId?: number): string {
  const url = new URL("/api/auth/connect/facebook/", getApiBaseUrl())
  if (reconnectId !== undefined) url.searchParams.set("reconnect", String(reconnectId))
  return url.toString()
}

export function instagramConnectUrl(): string {
  const url = new URL("/api/auth/connect/facebook/", getApiBaseUrl())
  url.searchParams.set("provider", "instagram")
  return url.toString()
}

export function threadsConnectUrl(): string {
  return new URL("/api/socials/threads/connect/", getApiBaseUrl()).toString()
}

export type FacebookPage = {
  id: string | number
  name: string
}

export type PendingSocialAccount = {
  id: string | number
  name: string
}

export async function listFacebookPages(): Promise<FacebookPage[]> {
  const response = await apiFetch("/api/auth/connect/facebook/select/")
  const data = await response.json() as PendingSocialAccount[] | { pages: PendingSocialAccount[] }
  return Array.isArray(data) ? data : data.pages
}

export async function selectFacebookPages(pageIds: string[]): Promise<void> {
  await apiFetch("/api/auth/connect/facebook/select/", {
    method: "POST",
    body: JSON.stringify({ page_ids: pageIds }),
  })
}

export async function listPendingSocialAccounts(): Promise<PendingSocialAccount[]> {
  const response = await apiFetch("/api/auth/connect/facebook/select/")
  const data = await response.json() as PendingSocialAccount[] | { results: PendingSocialAccount[] }
  return Array.isArray(data) ? data : data.results
}

export async function selectSocialAccounts(accountIds: string[]): Promise<void> {
  await apiFetch("/api/auth/connect/facebook/select/", {
    method: "POST",
    body: JSON.stringify({ page_ids: accountIds }),
  })
}

export type PostStatus = "draft" | "scheduled" | "publishing" | "posted" | "failed" | "deleted_on_facebook"

export type Post = {
  id: number
  account: number
  content: string
  image_url: string | null
  scheduled_at: string | null
  status: PostStatus
  error: string | null
  external_post_id: string | null
  permalink_url: string | null
  posted_at: string | null
  created_at: string
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  await fetchCsrf()
  return (await apiFetch("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  })).json() as Promise<LoginResponse>
}

export async function register(username: string, email: string, password: string): Promise<RegisterResponse> {
  await fetchCsrf()
  return (await apiFetch("/api/auth/register/", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  })).json() as Promise<RegisterResponse>
}

export async function logout(): Promise<OkResponse> {
  return (await apiFetch("/api/auth/logout/", { method: "POST" })).json() as Promise<OkResponse>
}

export async function me(): Promise<AuthUser> {
  return (await apiFetch("/api/auth/me/")).json() as Promise<AuthUser>
}

export async function fetchCsrf(): Promise<void> {
  await apiFetch("/api/auth/csrf/")
}

export async function listAccounts(): Promise<Account[]> {
  return unwrap(await (await apiFetch("/api/auth/social-accounts/")).json())
}

export async function listAnalyticsAccounts(): Promise<Account[]> {
  return unwrap(await (await apiFetch("/api/social-accounts/")).json())
}

export async function getAnalyticsOverview(accountId: number, days: 7 | 28 | 90): Promise<AnalyticsOverview> {
  const query = new URLSearchParams({ account: String(accountId), days: String(days) })
  return (await apiFetch(`/api/analytics/overview/?${query.toString()}`)).json() as Promise<AnalyticsOverview>
}

export async function listAnalyticsPosts(accountId: number): Promise<AnalyticsPost[]> {
  return unwrap(await (await apiFetch(`/api/analytics/posts/?account=${encodeURIComponent(String(accountId))}`)).json())
}

export async function listPosts(): Promise<Post[]> {
  return unwrap(await (await apiFetch("/api/posts/")).json())
}

export async function createPost({
  account,
  content,
  image_url,
}: {
  account: number
  content: string
  image_url?: string | null
}): Promise<Post> {
  return (await apiFetch("/api/posts/", {
    method: "POST",
    body: JSON.stringify({ account, content, image_url }),
  })).json() as Promise<Post>
}

export async function updatePost(id: number, partial: Partial<Post>): Promise<Post> {
  return (await apiFetch(`/api/posts/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(partial),
  })).json() as Promise<Post>
}

export async function deletePost(id: number): Promise<void> {
  await apiFetch(`/api/posts/${id}/`, { method: "DELETE" })
}

export async function schedulePost(id: number, scheduledAt: string): Promise<Post> {
  return (await apiFetch(`/api/posts/${id}/schedule/`, {
    method: "POST",
    body: JSON.stringify({ scheduled_at: scheduledAt }),
  })).json() as Promise<Post>
}

export async function publishPostNow(id: number): Promise<Post> {
  return (await apiFetch(`/api/posts/${id}/publish_now/`, {
    method: "POST",
  })).json() as Promise<Post>
}

export async function generate(topic: string): Promise<{ content: string }> {
  return (await apiFetch("/api/ai/generate/", {
    method: "POST",
    body: JSON.stringify({ topic }),
  })).json() as Promise<{ content: string }>
}

export type BillingValue = number | { used: number; limit: number | null }

export type BillingSummary = {
  plan: string
  status: string
  current_period_end?: string | null
  renewal_date?: string | null
  usage?: {
    accounts?: BillingValue
    posts_this_month?: BillingValue
    ai_generations?: BillingValue
  }
  limits?: {
    accounts?: number | null
    posts_this_month?: number | null
    ai_generations?: number | null
  }
}

export async function getBilling(): Promise<BillingSummary> {
  return (await apiFetch("/api/billing/me/")).json() as Promise<BillingSummary>
}

export async function cancelSubscription(): Promise<void> {
  await apiFetch("/api/billing/cancel/", {
    method: "POST",
    body: JSON.stringify({}),
  })
}

export type BillingRedirect = { checkout_url?: string; portal_url?: string; url?: string }

export async function createCheckout(plan = "pro", interval = "monthly"): Promise<BillingRedirect> {
  return (await apiFetch("/api/billing/checkout/", {
    method: "POST",
    body: JSON.stringify({ plan, interval }),
  })).json() as Promise<{ checkout_url: string }>
}

export async function createBillingPortal(): Promise<BillingRedirect> {
  return (await apiFetch("/api/billing/portal/", {
    method: "POST",
    body: JSON.stringify({}),
  })).json() as Promise<{ portal_url: string }>
}

export type AdminUser = {
  id: number
  username: string
  email: string
  plan: string
  status: string
  date_joined?: string
  last_login?: string | null
  is_active?: boolean
}

export type AdminUserPage = {
  results: AdminUser[]
  count: number
  page: number
  page_size: number
}

export async function listAdminUsers(params: { search?: string; status?: string; page?: number; pageSize?: number } = {}): Promise<AdminUserPage> {
  const query = new URLSearchParams()
  if (params.search) query.set("search", params.search)
  if (params.status) query.set("status", params.status)
  query.set("page", String(params.page ?? 1))
  query.set("page_size", String(params.pageSize ?? 20))
  const response = await apiFetch(`/api/admin/users/?${query.toString()}`)
  const data = await response.json() as AdminUserPage | { users: AdminUser[]; count?: number; total?: number }
  if ("results" in data) return data
  return {
    results: data.users,
    count: data.count ?? data.total ?? data.users.length,
    page: params.page ?? 1,
    page_size: params.pageSize ?? 20,
  }
}

export type AdminUserDetail = AdminUser & {
  accounts: Account[]
  recent_posts: Post[]
}

export async function getAdminUser(id: number): Promise<AdminUserDetail> {
  return (await apiFetch(`/api/admin/users/${id}/`)).json() as Promise<AdminUserDetail>
}

export async function updateAdminSubscription(id: number, data: { plan?: string; status?: string; current_period_end?: string }): Promise<AdminUser> {
  return (await apiFetch(`/api/admin/users/${id}/subscription/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })).json() as Promise<AdminUser>
}

export async function deactivateAdminUser(id: number): Promise<void> {
  await apiFetch(`/api/admin/users/${id}/deactivate/`, { method: "POST", body: JSON.stringify({}) })
}

export async function reactivateAdminUser(id: number): Promise<void> {
  await apiFetch(`/api/admin/users/${id}/reactivate/`, { method: "POST", body: JSON.stringify({}) })
}

export async function deleteAdminUser(id: number, username: string): Promise<void> {
  await apiFetch(`/api/admin/users/${id}/`, {
    method: "DELETE",
    body: JSON.stringify({ confirm: username }),
  })
}

export type AdminStats = {
  users: number
  active_subscriptions_by_plan: Record<string, number>
  posts_by_status: Record<string, number>
  failed_posts_last_7_days: number
}

export async function getAdminStats(): Promise<AdminStats> {
  return (await apiFetch("/api/admin/stats/")).json() as Promise<AdminStats>
}

export async function loginWithTwoFactor(data: TwoFactorLoginRequest): Promise<AuthIdentity> {
  return (await apiFetch("/api/auth/login/2fa/", {
    method: "POST",
    body: JSON.stringify(data),
  })).json() as Promise<AuthIdentity>
}

export async function getProfile(): Promise<Profile> {
  return (await apiFetch("/api/auth/profile/")).json() as Promise<Profile>
}

export async function updateProfile(data: UpdateProfileRequest): Promise<Profile> {
  return (await apiFetch("/api/auth/profile/", {
    method: "PATCH",
    body: JSON.stringify(data),
  })).json() as Promise<Profile>
}

export async function verifyEmail(data: VerifyEmailRequest): Promise<OkResponse> {
  const result = await (await apiFetch("/api/auth/verify-email/", {
    method: "POST",
    body: JSON.stringify(data),
  })).json() as OkResponse
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("postup:email-verified"))
  }
  return result
}

export async function resendVerification(): Promise<OkResponse> {
  return (await apiFetch("/api/auth/resend-verification/", {
    method: "POST",
  })).json() as Promise<OkResponse>
}

export async function requestPasswordReset(data: PasswordResetRequest): Promise<OkResponse> {
  return (await apiFetch("/api/auth/password-reset/", {
    method: "POST",
    body: JSON.stringify(data),
  })).json() as Promise<OkResponse>
}

export async function confirmPasswordReset(data: PasswordResetConfirmRequest): Promise<OkResponse> {
  return (await apiFetch("/api/auth/password-reset/confirm/", {
    method: "POST",
    body: JSON.stringify(data),
  })).json() as Promise<OkResponse>
}

export async function listSocialAccounts(): Promise<SocialAccount[]> {
  return (await apiFetch("/api/auth/social-accounts/")).json() as Promise<SocialAccount[]>
}

export async function changePassword(data: ChangePasswordRequest): Promise<OkResponse> {
  return (await apiFetch("/api/auth/change-password/", {
    method: "POST",
    body: JSON.stringify(data),
  })).json() as Promise<OkResponse>
}

export function deleteAccount(data: DeleteAccountRequest): Promise<void>
export function deleteAccount(id: number): Promise<void>
export async function deleteAccount(dataOrId: DeleteAccountRequest | number): Promise<void> {
  if (typeof dataOrId !== "number") {
    await apiFetch("/api/auth/delete-account/", {
      method: "POST",
      body: JSON.stringify(dataOrId),
    })
    return
  }

  try {
    await apiFetch(`/api/accounts/${dataOrId}/`, { method: "DELETE" })
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      const detail = error.payload?.detail
      if (typeof detail === "string") throw new Error(detail)
      if (Array.isArray(detail)) throw new Error(detail.join(" "))
      throw new Error(error.message)
    }
    throw error
  }
}

export async function setupTwoFactor(): Promise<TwoFactorSetupResponse> {
  return (await apiFetch("/api/auth/2fa/setup/", {
    method: "POST",
  })).json() as Promise<TwoFactorSetupResponse>
}

export async function enableTwoFactor(code: string): Promise<RecoveryCodesResponse> {
  return (await apiFetch("/api/auth/2fa/enable/", {
    method: "POST",
    body: JSON.stringify({ code }),
  })).json() as Promise<RecoveryCodesResponse>
}

export async function disableTwoFactor(data: DisableTwoFactorRequest): Promise<OkResponse> {
  return (await apiFetch("/api/auth/2fa/disable/", {
    method: "POST",
    body: JSON.stringify(data),
  })).json() as Promise<OkResponse>
}

export async function regenerateRecoveryCodes(data: RegenerateRecoveryCodesRequest): Promise<RecoveryCodesResponse> {
  return (await apiFetch("/api/auth/2fa/recovery-codes/regenerate/", {
    method: "POST",
    body: JSON.stringify(data),
  })).json() as Promise<RecoveryCodesResponse>
}

export async function listSessions(): Promise<Session[]> {
  return (await apiFetch("/api/auth/sessions/")).json() as Promise<Session[]>
}

export async function deleteSession(keyPrefix: string): Promise<void> {
  await apiFetch(`/api/auth/sessions/${encodeURIComponent(keyPrefix)}/`, { method: "DELETE" })
}

export async function revokeOtherSessions(): Promise<OkResponse> {
  return (await apiFetch("/api/auth/sessions/revoke-others/", {
    method: "POST",
  })).json() as Promise<OkResponse>
}

export async function getBillingOverview(): Promise<ContractBillingSummary> {
  return (await apiFetch("/api/billing/me/")).json() as Promise<ContractBillingSummary>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

async function getOptionalBillingResponse(path: string): Promise<unknown> {
  let response: Response
  try {
    response = await apiFetch(path)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }

  const body = await response.text()
  return body.trim() ? JSON.parse(body) as unknown : null
}

function isEmptyBillingResponse(value: unknown): boolean {
  return value === null
    || value === undefined
    || value === ""
    || (Array.isArray(value) && value.length === 0)
    || (isRecord(value) && (
      Object.keys(value).length === 0
      || (Array.isArray(value.results) && value.results.length === 0)
    ))
}

export async function getSubscription(): Promise<Subscription | null> {
  const response = await getOptionalBillingResponse("/api/billing/subscription/")
  return isEmptyBillingResponse(response) ? null : response as Subscription
}

export async function pollForPlanChange(previousPlan: Plan): Promise<Subscription | null> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const subscription = await getSubscription()
    if (subscription && subscription.plan !== previousPlan) return subscription
    if (attempt < 9) await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  return null
}

export async function checkout(data: CheckoutRequest): Promise<RedirectResponse> {
  return (await apiFetch("/api/billing/checkout/", {
    method: "POST",
    body: JSON.stringify(data),
  })).json() as Promise<RedirectResponse>
}

export async function billingPortal(): Promise<RedirectResponse> {
  return (await apiFetch("/api/billing/portal/", {
    method: "POST",
    body: JSON.stringify({}),
  })).json() as Promise<RedirectResponse>
}

export async function cancelAtPeriodEnd(): Promise<Subscription> {
  return (await apiFetch("/api/billing/cancel-at-period-end/", {
    method: "POST",
    body: JSON.stringify({}),
  })).json() as Promise<Subscription>
}

export async function resumeSubscription(): Promise<Subscription> {
  return (await apiFetch("/api/billing/resume/", {
    method: "POST",
    body: JSON.stringify({}),
  })).json() as Promise<Subscription>
}

export async function changePlan(data: ChangePlanRequest): Promise<Subscription> {
  return (await apiFetch("/api/billing/change-plan/", {
    method: "POST",
    body: JSON.stringify(data),
  })).json() as Promise<Subscription>
}

export async function listInvoices(): Promise<Invoice[]> {
  const response = await getOptionalBillingResponse("/api/billing/invoices/")
  if (isEmptyBillingResponse(response)) return []
  if (Array.isArray(response)) return response as Invoice[]
  if (isRecord(response)) {
    const results = response.results
    if (results === null || results === undefined) return []
    if (Array.isArray(results)) return results as Invoice[]
  }
  throw new Error("The invoice response was invalid.")
}

export async function getPaymentMethod(): Promise<PaymentMethod> {
  const response = await getOptionalBillingResponse("/api/billing/payment-method/")
  return isEmptyBillingResponse(response) ? null : response as PaymentMethod
}

export async function mockSubscribe(data: MockSubscribeRequest): Promise<void> {
  await apiFetch("/api/billing/mock-subscribe/", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function listContractAdminUsers(params: {
  page?: number
  page_size?: number
  search?: string
  plan?: string
  status?: string
} = {}): Promise<ContractAdminUserPage> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value))
  }
  const suffix = query.size ? `?${query.toString()}` : ""
  return (await apiFetch(`/api/admin/users/${suffix}`)).json() as Promise<ContractAdminUserPage>
}

export async function getContractAdminUser(id: number): Promise<ContractAdminUserDetail> {
  return (await apiFetch(`/api/admin/users/${id}/`)).json() as Promise<ContractAdminUserDetail>
}

export async function resetAdminUserTwoFactor(id: number): Promise<OkResponse> {
  return (await apiFetch(`/api/admin/users/${id}/reset-2fa/`, {
    method: "POST",
    body: JSON.stringify({}),
  })).json() as Promise<OkResponse>
}

export async function verifyAdminUserEmail(id: number): Promise<OkResponse> {
  return (await apiFetch(`/api/admin/users/${id}/verify-email/`, {
    method: "POST",
    body: JSON.stringify({}),
  })).json() as Promise<OkResponse>
}

export async function deactivateContractAdminUser(id: number): Promise<AdminUserActionResponse> {
  return (await apiFetch(`/api/admin/users/${id}/deactivate/`, {
    method: "POST",
    body: JSON.stringify({}),
  })).json() as Promise<AdminUserActionResponse>
}

export async function reactivateContractAdminUser(id: number): Promise<AdminUserActionResponse> {
  return (await apiFetch(`/api/admin/users/${id}/reactivate/`, {
    method: "POST",
    body: JSON.stringify({}),
  })).json() as Promise<AdminUserActionResponse>
}

export async function updateContractAdminSubscription(
  id: number,
  data: AdminSubscriptionUpdateRequest
): Promise<ContractAdminUser> {
  return (await apiFetch(`/api/admin/users/${id}/subscription/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })).json() as Promise<ContractAdminUser>
}

export async function getAuditLog(params: {
  page?: number
  action?: string
  target?: string
} = {}): Promise<AuditLogPage> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value))
  }
  const suffix = query.size ? `?${query.toString()}` : ""
  return (await apiFetch(`/api/admin/audit-log/${suffix}`)).json() as Promise<AuditLogPage>
}

export const authApi = {
  fetchCsrf,
  me,
  login,
  loginWithTwoFactor,
  register,
  logout,
  getProfile,
  updateProfile,
  verifyEmail,
  resendVerification,
  requestPasswordReset,
  confirmPasswordReset,
  listSocialAccounts,
}

export const securityApi = {
  changePassword,
  deleteAccount,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  regenerateRecoveryCodes,
  listSessions,
  deleteSession,
  revokeOtherSessions,
}

export const billingApi = {
  getOverview: getBillingOverview,
  getSubscription,
  pollForPlanChange,
  checkout,
  portal: billingPortal,
  cancelAtPeriodEnd,
  resumeSubscription,
  changePlan,
  listInvoices,
  getPaymentMethod,
  mockSubscribe,
}

export const adminApi = {
  listUsers: listContractAdminUsers,
  getUser: getContractAdminUser,
  resetTwoFactor: resetAdminUserTwoFactor,
  verifyEmail: verifyAdminUserEmail,
  deactivateUser: deactivateContractAdminUser,
  reactivateUser: reactivateContractAdminUser,
  updateSubscription: updateContractAdminSubscription,
  getAuditLog,
}
