export type OkResponse = { ok: true }

export type AuthIdentity = {
  id: number
  username: string
}

export type AuthUser = AuthIdentity & {
  is_staff: boolean
  is_superuser: boolean
  email_verified: boolean
  totp_enabled: boolean
}

export type LoginRequest = {
  username: string
  password: string
}

export type LoginResponse = AuthIdentity | { two_factor_required: true }

export type TwoFactorLoginRequest =
  | { code: string; recovery_code?: never }
  | { recovery_code: string; code?: never }

export type RegisterRequest = {
  username: string
  email: string
  password: string
}

export type RegisterResponse = AuthIdentity & { email: string }

export type Profile = {
  username: string
  email: string
  first_name: string
  last_name: string
  email_verified: boolean
}

export type UpdateProfileRequest = Partial<Pick<Profile, "username" | "email" | "first_name" | "last_name">>

export type ChangePasswordRequest = {
  current_password: string
  new_password: string
}

export type DeleteAccountRequest = {
  password: string
  confirm: string
}

export type VerifyEmailRequest = { token: string }

export type PasswordResetRequest = { email: string }

export type PasswordResetConfirmRequest = {
  uid: string
  token: string
  new_password: string
}

export type TwoFactorSetupResponse = {
  otpauth_uri: string
  secret: string
}

export type RecoveryCodesResponse = { recovery_codes: string[] }

export type DisableTwoFactorRequest = {
  password: string
  code: string
}

export type RegenerateRecoveryCodesRequest = DisableTwoFactorRequest

export type Session = {
  key_prefix: string
  expire_date: string
  current: boolean
}

export type SocialAccount = {
  id: number
  provider: string
  external_id: string
  name: string
  status: string
  scopes: string
  connected_at: string
}

export type AnalyticsMetric = "views" | "reach" | "engagements" | "follows" | "unfollows" | "followers_total"

export type AnalyticsOverview = {
  range: string
  totals: Record<AnalyticsMetric, number | null>
  series: Partial<Record<AnalyticsMetric, { date: string; value: number | null }[]>>
  unavailable: AnalyticsMetric[]
}

export type AnalyticsPost = {
  id: number
  message: string
  created_time: string
  permalink_url: string
  reactions: number | null
  comments: number | null
  shares: number | null
}

export type Plan = "free" | "pro" | "agency"

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "suspended"

export type UsageLimit = {
  used: number
  limit: number | null
}

export type BillingSummary = {
  plan: Plan
  status: SubscriptionStatus
  usage: {
    connected_accounts: UsageLimit
    posts_per_month: UsageLimit
    ai_generations_per_hour: UsageLimit
  }
  current_period_end: string | null
}

export type Subscription = {
  plan: Plan
  status: SubscriptionStatus
  started_at: string | null
  current_period_end: string | null
  next_billing_date: string | null
  cancel_at_period_end: boolean
  trial_ends_at: string | null
  days_remaining: number | null
}

export type CheckoutRequest = { plan: Exclude<Plan, "free"> }
export type RedirectResponse = { url: string }
export type ChangePlanRequest = { plan: Plan }
export type PaymentMethod = {
  brand: string
  last4: string
  exp_month: number
  exp_year: number
} | null
export type MockSubscribeRequest = {
  plan: Exclude<Plan, "free">
  card_number: string
  exp_month: number
  exp_year: number
  cvv: string
}

export type Invoice = {
  id: string
  amount: number
  currency: string
  status: string
  date: string
  hosted_invoice_url: string | null
}

export type AdminUser = {
  id: number
  username: string
  email: string
  plan: Plan
  status: SubscriptionStatus
  is_active: boolean
  is_staff: boolean
  is_superuser?: boolean
  date_joined: string
  subscription: {
    plan: Plan
    status: SubscriptionStatus
    current_period_end: string | null
  } | null
}

export type AdminUserDetail = AdminUser & {
  email_verified: boolean
  totp_enabled: boolean
  trial_ends_at: string | null
  cancel_at_period_end: boolean
}

export type AdminUserPage = {
  count: number
  next: string | null
  previous: string | null
  results: AdminUser[]
}

export type AdminSubscriptionUpdateRequest = {
  plan?: Plan
  status?: SubscriptionStatus
  extend_days?: number
}

export type AdminUserActionResponse =
  | OkResponse
  | { is_active: boolean; stripe_cancelled?: boolean; subscription_status?: SubscriptionStatus }

export type AuditLogEntry = {
  id: number
  who_identifier: string
  target_identifier: string
  action: string
  timestamp: string
  details: Record<string, unknown>
}

export type AuditLogPage = {
  count: number
  next: string | null
  previous: string | null
  results: AuditLogEntry[]
}

export type ApiErrorResponse = {
  detail: string | Record<string, unknown>
  code: string
}
