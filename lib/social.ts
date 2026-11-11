import type { Account, Post } from "@/lib/api"

export const facebookErrors = {
  facebook_unavailable: "Facebook could not be reached. Check your connection and try again.",
  permissions_declined: "Facebook permissions were declined. The pages_manage_posts and pages_show_list permissions are required to connect Pages.",
  no_pages: "No Facebook Pages were found for this account. Create or manage a Page, then try connecting again.",
  no_instagram_accounts: "No Instagram professional accounts were found for this Facebook Page. Connect an Instagram professional account and try again.",
  page_not_available: "Your Facebook account cannot access the selected Page. Check that you have permission to manage it, then try again.",
  facebook_denied: "Facebook authorization was denied or cancelled. Try connecting again and approve the requested access.",
  invalid_state: "The Facebook connection could not be verified, or it expired. Start the connection again.",
  missing_code: "Facebook did not return an authorization code. Start the connection again.",
} as const

export const threadsErrors: Record<string, string> = {
  threads_unavailable: "Threads could not be reached. Check your connection and try again.",
  permissions_declined: "Threads permissions were declined. Approve the requested access to connect.",
  threads_denied: "Threads authorization was denied or cancelled. Try connecting again.",
  invalid_state: "The Threads connection could not be verified, or it expired. Start the connection again.",
  missing_code: "Threads did not return an authorization code. Start the connection again.",
  expired_token: "Your Threads access token expired. Reconnect the account.",
  token_expired: "Your Threads access token expired. Reconnect the account.",
  access_token_expired: "Your Threads access token expired. Reconnect the account.",
  invalid_token: "Your Threads access token is invalid. Reconnect the account.",
  token_invalid: "Your Threads access token is invalid. Reconnect the account.",
  invalid_grant: "Your Threads authorization is no longer valid. Reconnect the account.",
  not_connected: "This Threads account is no longer connected. Connect it again.",
  account_not_connected: "This Threads account is no longer connected. Connect it again.",
  needs_reauth: "Your Threads connection needs to be renewed. Reconnect the account.",
  reauth_required: "Your Threads connection needs to be renewed. Reconnect the account.",
}

export function providerLabel(provider: string): string {
  if (provider === "instagram") return "Instagram"
  if (provider === "facebook") return "Facebook"
  if (provider === "threads") return "Threads"
  return provider
}

export function accountDisplayName(account: Account): string {
  if (account.provider !== "threads") return account.name
  const username = account.username?.trim() || account.name.trim()
  return `@${username.replace(/^@/, "")}`
}

export function accountReauthWarning(account: Account): string | null {
  if (account.status !== "needs_reauth") return null
  return "Scheduled posts for this account will fail until it is reconnected."
}

export function canEditPost(post: Post): boolean {
  return post.status === "draft" || post.status === "scheduled"
}

export function postStatusLabel(status: Post["status"]): string {
  return status === "deleted_on_facebook" ? "Deleted on Facebook" : status
}

export function isValidInstagramImageUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && Boolean(url.hostname)
  } catch {
    return false
  }
}

export function instagramImageValidationError(provider: string | undefined, imageUrl: string): string {
  if (provider !== "instagram") return ""
  if (!imageUrl.trim()) {
    return "Instagram posts require an image. Add a publicly accessible HTTPS image URL before scheduling."
  }
  if (!isValidInstagramImageUrl(imageUrl.trim())) {
    return "Enter an absolute HTTPS image URL for Instagram posts."
  }
  return ""
}

export function localDateTimeToIsoWithOffset(value: string): string | null {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return null

  const pad = (part: number) => String(part).padStart(2, "0")
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? "+" : "-"
  const offset = Math.abs(offsetMinutes)
  const localDate = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-")
  const localTime = [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join(":")

  return `${localDate}T${localTime}.${String(date.getMilliseconds()).padStart(3, "0")}${sign}${pad(Math.floor(offset / 60))}:${pad(offset % 60)}`
}
