# API Contract

Base: existing API base URL. Session cookie auth, credentials "include".
Unsafe methods (POST/PATCH/DELETE): header X-CSRFToken = cookie postup_csrftoken. Fetch cookie via GET /api/auth/csrf/.
Error body: {"detail": string | object, "code": string}
Codes: plan_limit(402), account_suspended(403), account_deactivated(403), email_not_verified(403), protected_user(400), validation_error(400), throttled(429), not_authenticated(401/403), permission_denied(403), not_found(404)

## Auth /api/auth/
GET  me/ -> {id, username, is_staff, is_superuser, email_verified, totp_enabled}
POST login/ {username, password} -> {id, username} | {two_factor_required: true}
POST login/2fa/ {code} | {recovery_code} -> {id, username}
POST register/ {username, email, password} -> {id, username, email}
POST logout/ -> {ok}
GET  profile/ -> {username, email, first_name, last_name, email_verified}
PATCH profile/ {username?, email?, first_name?, last_name?} -> profile
POST change-password/ {current_password, new_password} -> {ok}
POST delete-account/ {password, confirm} -> 204
POST verify-email/ {token} -> {ok}
POST resend-verification/ -> {ok}  (429 throttled)
POST password-reset/ {email} -> {ok} (always 200)
POST password-reset/confirm/ {uid, token, new_password} -> {ok}
POST 2fa/setup/ -> {otpauth_uri, secret}
POST 2fa/enable/ {code} -> {recovery_codes: string[10]}  (shown once)
POST 2fa/disable/ {password, code} -> {ok}
POST 2fa/recovery-codes/regenerate/ {password, code} -> {recovery_codes: string[10]}
GET  sessions/ -> [{key_prefix, expire_date, current}]
DELETE sessions/<key_prefix>/ -> 204
POST sessions/revoke-others/ -> {ok}
GET  social-accounts/ -> [{id, provider, external_id, name, status, scopes, connected_at}]

## Billing /api/billing/
The frontend selects its billing UI with `NEXT_PUBLIC_BILLING_PROVIDER` (`mock` or `stripe`, default `mock`); the backend independently enforces `BILLING_PROVIDER`.
GET  me/ -> {plan, status, usage: {connected_accounts:{used,limit}, posts_per_month:{used,limit}, ai_generations_per_hour:{used,limit}}, current_period_end}
GET  subscription/ -> {plan, status, started_at, current_period_end, next_billing_date, cancel_at_period_end, trial_ends_at, days_remaining}
GET  payment-method/ -> {brand, last4, exp_month, exp_year} | null (authenticated; Stripe summary in Stripe mode)
POST mock-subscribe/ {plan: "pro"|"agency", card_number, exp_month, exp_year, cvv} -> billing summary (mock mode only)
Saved billing metadata: nullable card_brand, card_last4, card_exp_month, card_exp_year. Never persist card_number or cvv. If mock-subscribe fails, retain the previous saved card; clear metadata only when no previous card exists.
POST checkout/ {plan: "pro"|"agency"} -> 201 {url}  (redirect)
POST portal/ -> {url}  (redirect)
POST cancel-at-period-end/ -> subscription
POST resume/ -> subscription
POST change-plan/ {plan} -> subscription  (rejects same plan)
GET  invoices/ -> [{id, amount, currency, status, date, hosted_invoice_url}]
Status values: trialing, active, past_due, canceled, suspended
Plans: free, pro, agency
Limits: accounts 1/5/20, posts_per_month 10/500/5000, ai_per_hour 5/60/200

## Admin /api/admin/  (is_staff only)
GET  users/?page=&page_size=&search=&plan=&status= -> {count, next, previous, results: AdminUser[]}
GET  users/<id>/ -> AdminUser + {email_verified, totp_enabled, trial_ends_at, cancel_at_period_end}
POST users/<id>/reset-2fa/ -> {ok}
POST users/<id>/verify-email/ -> {ok}
POST users/<id>/deactivate/ -> {is_active, stripe_cancelled}
POST users/<id>/reactivate/ -> {is_active, subscription_status}
PATCH users/<id>/subscription/ {plan?, status?, extend_days?} -> AdminUser
GET  audit-log/?page=&action=&target= -> {count, next, previous, results: [{id, who_identifier, target_identifier, action, timestamp, details}]}
AdminUser: {id, username, email, plan, status, is_active, is_staff, date_joined, subscription: {plan, status, current_period_end} | null}
Superuser targets: destructive actions return 400 code protected_user.