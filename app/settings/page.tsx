"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"
import { Copy, Download, RefreshCw } from "lucide-react"
import { useAuth } from "@/components/AuthProvider"
import MockBillingForm from "@/components/MockBillingForm"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  changePassword,
  billingApi,
  ApiError,
  deleteAccount,
  disableTwoFactor,
  enableTwoFactor,
  getProfile,
  listSessions,
  regenerateRecoveryCodes,
  revokeOtherSessions,
  setupTwoFactor,
  updateProfile,
  deleteSession,
} from "@/lib/api"
import type { BillingSummary, Invoice, PaymentMethod, Plan, Profile, Session, Subscription, TwoFactorSetupResponse, UsageLimit } from "@/lib/api-types"

type SettingsTab = "Profile" | "Security" | "Billing" | "Danger zone"
type LoadState = "loading" | "loaded" | "error"
type ProfileFields = Pick<Profile, "username" | "email" | "first_name" | "last_name">

const tabs: SettingsTab[] = ["Profile", "Security", "Billing", "Danger zone"]
const billingProvider = process.env.NEXT_PUBLIC_BILLING_PROVIDER === "stripe" ? "stripe" : "mock"

function billingErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.status >= 500 ? "Something went wrong. Please try again." : error.message
  }
  if (error instanceof TypeError) return "Something went wrong. Please try again."
  return "Billing details could not be loaded."
}

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, refresh, clearUser } = useAuth()
  const [activeTab, setActiveTab] = useState<SettingsTab>(() =>
    searchParams.get("tab") === "billing" ? "Billing" : "Profile"
  )

  const availableTabs = user?.is_superuser ? tabs.filter((tab) => tab !== "Danger zone") : tabs

  return (
    <main className="min-h-screen px-5 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your profile and account security.</p>
        </header>

        <div className="flex flex-wrap gap-2 border-b" role="tablist" aria-label="Settings sections">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              id={`settings-tab-${tab.toLowerCase().replaceAll(" ", "-")}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls="settings-panel"
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-3 py-2 text-sm font-medium ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <section id="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${activeTab.toLowerCase().replaceAll(" ", "-")}`}>
          {activeTab === "Profile" ? <ProfilePanel onRefreshAuth={refresh} /> : null}
          {activeTab === "Security" ? <SecurityPanel isTwoFactorEnabled={user?.totp_enabled ?? false} /> : null}
          {activeTab === "Billing" ? user?.is_superuser ? (
            <p role="status" className="text-sm text-muted-foreground">Superuser account: billing not applicable</p>
          ) : <BillingPanel /> : null}
          {activeTab === "Danger zone" && !user?.is_superuser ? (
            <DeleteAccountPanel
              username={user?.username ?? ""}
              onDeleted={() => {
                clearUser()
                router.replace("/")
              }}
            />
          ) : null}
        </section>
      </div>
    </main>
  )
}

function ProfilePanel({ onRefreshAuth }: { onRefreshAuth: () => Promise<unknown> }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fields, setFields] = useState<ProfileFields>({ username: "", email: "", first_name: "", last_name: "" })
  const [loadState, setLoadState] = useState<LoadState>("loading")
  const [loadError, setLoadError] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [notice, setNotice] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isActive = true
    setLoadState("loading")
    setLoadError("")
    getProfile()
      .then((value) => {
        if (!isActive) return
        setProfile(value)
        setFields({
          username: value.username,
          email: value.email,
          first_name: value.first_name,
          last_name: value.last_name,
        })
        setLoadState("loaded")
      })
      .catch((error: unknown) => {
        if (!isActive) return
        setLoadError(error instanceof Error ? error.message : "Unable to load your profile.")
        setLoadState("error")
      })
    return () => {
      isActive = false
    }
  }, [reloadKey])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setSubmitError("")
    setNotice("")
    const emailChanged = Boolean(profile && profile.email.trim().toLowerCase() !== fields.email.trim().toLowerCase())
    try {
      const updatedProfile = await updateProfile({
        username: fields.username.trim(),
        email: fields.email.trim(),
        first_name: fields.first_name.trim(),
        last_name: fields.last_name.trim(),
      })
      setProfile(updatedProfile)
      setFields({
        username: updatedProfile.username,
        email: updatedProfile.email,
        first_name: updatedProfile.first_name,
        last_name: updatedProfile.last_name,
      })
      if (emailChanged) {
        setNotice("Profile saved. Check your new email address for a verification link.")
        try {
          await onRefreshAuth()
        } catch {
          setSubmitError("Your profile was saved, but account status could not be refreshed. Reload the page to update it.")
        }
      } else {
        setNotice("Profile saved.")
        await onRefreshAuth()
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save your profile.")
    } finally {
      setIsSaving(false)
    }
  }

  function updateField(field: keyof ProfileFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update the name and email associated with your account.</CardDescription>
      </CardHeader>
      <CardContent>
        {loadState === "loading" ? <p role="status" className="text-sm text-muted-foreground">Loading profile...</p> : null}
        {loadState === "error" ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">{loadError}</p>
            <Button type="button" variant="outline" onClick={() => setReloadKey((key) => key + 1)}>Retry</Button>
          </div>
        ) : null}
        {loadState === "loaded" && !profile ? <p role="status" className="text-sm text-muted-foreground">No profile data is available.</p> : null}
        {loadState === "loaded" && profile ? (
          <form className="grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="profile-username" className="text-sm font-medium">Username</label>
              <Input id="profile-username" autoComplete="username" value={fields.username} onChange={(event) => updateField("username", event.target.value)} required />
            </div>
            <div className="space-y-2">
              <label htmlFor="profile-email" className="text-sm font-medium">Email</label>
              <Input id="profile-email" type="email" autoComplete="email" value={fields.email} onChange={(event) => updateField("email", event.target.value)} required />
            </div>
            <div className="space-y-2">
              <label htmlFor="profile-first-name" className="text-sm font-medium">First name</label>
              <Input id="profile-first-name" autoComplete="given-name" value={fields.first_name} onChange={(event) => updateField("first_name", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label htmlFor="profile-last-name" className="text-sm font-medium">Last name</label>
              <Input id="profile-last-name" autoComplete="family-name" value={fields.last_name} onChange={(event) => updateField("last_name", event.target.value)} />
            </div>
            {notice ? <p role="status" className="sm:col-span-2 text-sm text-green-700 dark:text-green-400">{notice}</p> : null}
            {submitError ? <p role="alert" className="sm:col-span-2 text-sm text-destructive">{submitError}</p> : null}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save profile"}</Button>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  )
}

function SecurityPanel({ isTwoFactorEnabled }: { isTwoFactorEnabled: boolean }) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionsState, setSessionsState] = useState<LoadState>("loading")
  const [sessionsError, setSessionsError] = useState("")
  const [sessionAction, setSessionAction] = useState("")
  const [sessionReloadKey, setSessionReloadKey] = useState(0)

  useEffect(() => {
    let isActive = true
    setSessionsState("loading")
    setSessionsError("")
    listSessions()
      .then((items) => {
        if (!isActive) return
        setSessions(items)
        setSessionsState("loaded")
      })
      .catch((error: unknown) => {
        if (!isActive) return
        setSessionsError(error instanceof Error ? error.message : "Unable to load sessions.")
        setSessionsState("error")
      })
    return () => {
      isActive = false
    }
  }, [sessionReloadKey])

  async function handleRevokeSession(keyPrefix: string) {
    setSessionAction(keyPrefix)
    setSessionsError("")
    try {
      await deleteSession(keyPrefix)
      setSessionReloadKey((key) => key + 1)
    } catch (error) {
      setSessionsError(error instanceof Error ? error.message : "Unable to revoke this session.")
    } finally {
      setSessionAction("")
    }
  }

  async function handleRevokeOthers() {
    setSessionAction("others")
    setSessionsError("")
    try {
      await revokeOtherSessions()
      setSessionReloadKey((key) => key + 1)
    } catch (error) {
      setSessionsError(error instanceof Error ? error.message : "Unable to revoke other sessions.")
    } finally {
      setSessionAction("")
    }
  }

  return (
    <div className="space-y-6">
      <ChangePasswordForm />
      <TwoFactorPanel isEnabled={isTwoFactorEnabled} />
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Active sessions</CardTitle>
              <CardDescription>Review and revoke sessions signed in to your account.</CardDescription>
            </div>
            <Button type="button" variant="outline" disabled={sessionAction !== "" || sessionsState === "loading" || sessionsState === "error" || sessions.length < 2} onClick={() => void handleRevokeOthers()}>
              {sessionAction === "others" ? "Revoking..." : "Revoke others"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sessionsState === "loading" ? <p role="status" className="text-sm text-muted-foreground">Loading sessions...</p> : null}
          {sessionsState === "error" ? (
            <div className="space-y-3">
              <p role="alert" className="text-sm text-destructive">{sessionsError}</p>
              <Button type="button" variant="outline" onClick={() => setSessionReloadKey((key) => key + 1)}>Retry</Button>
            </div>
          ) : null}
          {sessionsState === "loaded" && sessions.length === 0 ? <p className="text-sm text-muted-foreground">No active sessions found.</p> : null}
          {sessionsState === "loaded" && sessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th scope="col" className="py-2 pr-4 font-medium">Session</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Expires</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Status</th>
                    <th scope="col" className="py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.key_prefix} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-mono">{session.key_prefix}</td>
                      <td className="py-3 pr-4">{new Date(session.expire_date).toLocaleString()}</td>
                      <td className="py-3 pr-4">{session.current ? "Current" : "Active"}</td>
                      <td className="py-3 text-right">
                        {!session.current ? (
                          <Button type="button" size="sm" variant="outline" disabled={sessionAction !== ""} onClick={() => void handleRevokeSession(session.key_prefix)}>
                            {sessionAction === session.key_prefix ? "Revoking..." : "Revoke"}
                          </Button>
                        ) : <span className="text-muted-foreground">This device</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {sessionsError && sessionsState === "loaded" ? <p role="alert" className="mt-3 text-sm text-destructive">{sessionsError}</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")
    setError("")
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.")
      return
    }
    setIsSaving(true)
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword })
      setMessage("Password changed.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to change your password.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="current-password" className="text-sm font-medium">Current password</label>
            <Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-medium">New password</label>
            <Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirm-new-password" className="text-sm font-medium">Confirm new password</label>
            <Input id="confirm-new-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required />
          </div>
          {message ? <p role="status" className="sm:col-span-2 text-sm text-green-700 dark:text-green-400">{message}</p> : null}
          {error ? <p role="alert" className="sm:col-span-2 text-sm text-destructive">{error}</p> : null}
          <div className="sm:col-span-2"><Button type="submit" disabled={isSaving}>{isSaving ? "Updating..." : "Change password"}</Button></div>
        </form>
      </CardContent>
    </Card>
  )
}

function TwoFactorPanel({ isEnabled }: { isEnabled: boolean }) {
  const { refresh } = useAuth()
  const [setup, setSetup] = useState<TwoFactorSetupResponse | null>(null)
  const [setupError, setSetupError] = useState("")
  const [setupLoading, setSetupLoading] = useState(false)
  const [confirmationCode, setConfirmationCode] = useState("")
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [recoveryError, setRecoveryError] = useState("")
  const [enableError, setEnableError] = useState("")
  const [isEnabling, setIsEnabling] = useState(false)
  const [disablePassword, setDisablePassword] = useState("")
  const [disableCode, setDisableCode] = useState("")
  const [disableError, setDisableError] = useState("")
  const [isDisabling, setIsDisabling] = useState(false)
  const [regeneratePassword, setRegeneratePassword] = useState("")
  const [regenerateCode, setRegenerateCode] = useState("")
  const [regenerateError, setRegenerateError] = useState("")
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [message, setMessage] = useState("")

  async function handleSetup() {
    setSetupLoading(true)
    setSetupError("")
    setMessage("")
    try {
      setSetup(await setupTwoFactor())
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Unable to start two-factor setup.")
    } finally {
      setSetupLoading(false)
    }
  }

  async function handleEnable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsEnabling(true)
    setEnableError("")
    try {
      const response = await enableTwoFactor(confirmationCode.trim())
      setRecoveryCodes(response.recovery_codes)
      setSetup(null)
      setConfirmationCode("")
      await refresh()
    } catch (error) {
      setEnableError(error instanceof Error ? error.message : "Unable to enable two-factor authentication.")
    } finally {
      setIsEnabling(false)
    }
  }

  async function handleDisable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsDisabling(true)
    setDisableError("")
    setMessage("")
    try {
      await disableTwoFactor({ password: disablePassword, code: disableCode.trim() })
      setDisablePassword("")
      setDisableCode("")
      setRecoveryCodes([])
      setMessage("Two-factor authentication disabled.")
      await refresh()
    } catch (error) {
      setDisableError(error instanceof Error ? error.message : "Unable to disable two-factor authentication.")
    } finally {
      setIsDisabling(false)
    }
  }

  async function handleRegenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsRegenerating(true)
    setRegenerateError("")
    setMessage("")
    try {
      const response = await regenerateRecoveryCodes({ password: regeneratePassword, code: regenerateCode.trim() })
      setRecoveryCodes(response.recovery_codes)
      setRegeneratePassword("")
      setRegenerateCode("")
    } catch (error) {
      setRegenerateError(error instanceof Error ? error.message : "Unable to regenerate recovery codes.")
    } finally {
      setIsRegenerating(false)
    }
  }

  async function copyRecoveryCodes() {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"))
      setCopied(true)
    } catch {
      setRecoveryError("Clipboard access failed. Select and copy the codes manually.")
    }
  }

  function downloadRecoveryCodes() {
    const blob = new Blob([recoveryCodes.join("\n")], { type: "text/plain;charset=utf-8" })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = objectUrl
    link.download = "postup-recovery-codes.txt"
    link.click()
    URL.revokeObjectURL(objectUrl)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-factor authentication</CardTitle>
        <CardDescription>Protect sign-in with an authenticator app and recovery codes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm">Status: {isEnabled ? "Enabled" : "Not enabled"}</p>
        {message ? <p role="status" className="text-sm text-green-700 dark:text-green-400">{message}</p> : null}

        {!isEnabled && !setup ? (
          <div className="space-y-3">
            {setupError ? <p role="alert" className="text-sm text-destructive">{setupError}</p> : null}
            <Button type="button" disabled={setupLoading} onClick={() => void handleSetup()}>
              {setupLoading ? "Preparing..." : "Set up two-factor authentication"}
            </Button>
          </div>
        ) : null}

        {setup ? (
          <div className="space-y-5">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="rounded-md border bg-white p-3">
                <QRCodeSVG value={setup.otpauth_uri} size={192} level="M" />
              </div>
              <div className="space-y-2 text-sm">
                <p>Scan the QR code with your authenticator app. If you cannot scan it, enter this setup key:</p>
                <code className="block break-all rounded border bg-muted p-3">{setup.secret}</code>
              </div>
            </div>
            <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleEnable}>
              <div className="w-full space-y-2 sm:max-w-xs">
                <label htmlFor="totp-confirmation-code" className="text-sm font-medium">Authenticator code</label>
                <Input id="totp-confirmation-code" inputMode="numeric" autoComplete="one-time-code" value={confirmationCode} onChange={(event) => setConfirmationCode(event.target.value)} required />
              </div>
              <Button type="submit" disabled={isEnabling}>{isEnabling ? "Verifying..." : "Confirm and enable"}</Button>
              <Button type="button" variant="outline" disabled={isEnabling} onClick={() => { setSetup(null); setConfirmationCode(""); setSetupError("") }}>Cancel</Button>
            </form>
            {enableError ? <p role="alert" className="text-sm text-destructive">{enableError}</p> : null}
          </div>
        ) : null}

        {isEnabled ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <form className="space-y-3 rounded-md border p-4" onSubmit={handleDisable}>
              <h3 className="font-medium">Disable two-factor authentication</h3>
              <div className="space-y-2">
                <label htmlFor="disable-totp-password" className="text-sm">Password</label>
                <Input id="disable-totp-password" type="password" autoComplete="current-password" value={disablePassword} onChange={(event) => setDisablePassword(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <label htmlFor="disable-totp-code" className="text-sm">Authenticator or recovery code</label>
                <Input id="disable-totp-code" autoComplete="one-time-code" value={disableCode} onChange={(event) => setDisableCode(event.target.value)} required />
              </div>
              {disableError ? <p role="alert" className="text-sm text-destructive">{disableError}</p> : null}
              <Button type="submit" variant="outline" disabled={isDisabling}>{isDisabling ? "Disabling..." : "Disable 2FA"}</Button>
            </form>
            <form className="space-y-3 rounded-md border p-4" onSubmit={handleRegenerate}>
              <h3 className="font-medium">Regenerate recovery codes</h3>
              <div className="space-y-2">
                <label htmlFor="regenerate-codes-password" className="text-sm">Password</label>
                <Input id="regenerate-codes-password" type="password" autoComplete="current-password" value={regeneratePassword} onChange={(event) => setRegeneratePassword(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <label htmlFor="regenerate-codes-code" className="text-sm">Authenticator or recovery code</label>
                <Input id="regenerate-codes-code" autoComplete="one-time-code" value={regenerateCode} onChange={(event) => setRegenerateCode(event.target.value)} required />
              </div>
              {regenerateError ? <p role="alert" className="text-sm text-destructive">{regenerateError}</p> : null}
              <Button type="submit" variant="outline" disabled={isRegenerating}>{isRegenerating ? "Regenerating..." : "Regenerate codes"}</Button>
            </form>
          </div>
        ) : null}

        {recoveryCodes.length > 0 ? (
          <section className="space-y-4 rounded-md border border-amber-500/40 bg-amber-500/5 p-4" aria-label="Recovery codes">
            <div>
              <h3 className="font-medium">Save your recovery codes now</h3>
              <p className="mt-1 text-sm text-muted-foreground">These codes are shown only once. Keep them somewhere secure.</p>
            </div>
            <ul className="grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-5">
              {recoveryCodes.map((code) => <li key={code} className="rounded border bg-background px-2 py-1">{code}</li>)}
            </ul>
            {recoveryError ? <p role="alert" className="text-sm text-destructive">{recoveryError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => { setRecoveryError(""); void copyRecoveryCodes() }}>
                <Copy aria-hidden="true" /> {copied ? "Copied" : "Copy codes"}
              </Button>
              <Button type="button" variant="outline" onClick={downloadRecoveryCodes}>
                <Download aria-hidden="true" /> Download codes
              </Button>
              <Button type="button" onClick={() => { setRecoveryCodes([]); setCopied(false) }}>I saved these codes</Button>
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  )
}

function DeleteAccountPanel({ username, onDeleted }: { username: string; onDeleted: () => void }) {
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (confirmation !== username) {
      setError("Type your username exactly to confirm account deletion.")
      return
    }
    setIsDeleting(true)
    try {
      await deleteAccount({ password, confirm: confirmation })
      setPassword("")
      setConfirmation("")
      onDeleted()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to delete your account.")
      setIsDeleting(false)
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Delete account</CardTitle>
        <CardDescription>This permanently deletes your account and cannot be undone.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="max-w-lg space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="delete-account-password" className="text-sm font-medium">Password</label>
            <Input id="delete-account-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <label htmlFor="delete-account-confirm" className="text-sm font-medium">Type {username} to confirm</label>
            <Input id="delete-account-confirm" autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
          </div>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" disabled={isDeleting}>
            {isDeleting ? "Deleting account..." : "Delete account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function PlaceholderPanel({ title, message }: { title: string; message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent><p className="text-sm text-muted-foreground">{message}</p></CardContent>
    </Card>
  )
}

const planOptions: { plan: Plan; accounts: number; posts: number; ai: number }[] = [
  { plan: "free", accounts: 1, posts: 10, ai: 5 },
  { plan: "pro", accounts: 5, posts: 500, ai: 60 },
  { plan: "agency", accounts: 20, posts: 5000, ai: 200 },
]

function formattedDate(value: string | null): string {
  if (!value) return "Not available"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleDateString()
}

function BillingPanel() {
  const [overview, setOverview] = useState<BillingSummary | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(true)
  const [mockPlan, setMockPlan] = useState<Exclude<Plan, "free">>("pro")
  const [loadState, setLoadState] = useState<LoadState>("loading")
  const [loadError, setLoadError] = useState("")
  const [actionError, setActionError] = useState("")
  const [message, setMessage] = useState("")
  const [pendingAction, setPendingAction] = useState("")
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isActive = true
    setLoadState("loading")
    setLoadError("")
    Promise.all([
      billingApi.getOverview(),
      billingApi.getSubscription(),
      billingApi.listInvoices(),
      billingProvider === "mock" ? billingApi.getPaymentMethod() : Promise.resolve(null),
    ])
      .then(([billingOverview, currentSubscription, currentInvoices, savedPaymentMethod]) => {
        if (!isActive) return
        setOverview(billingOverview)
        setSubscription(currentSubscription)
        setInvoices(currentInvoices)
        setPaymentMethod(savedPaymentMethod)
        setShowPaymentForm(!savedPaymentMethod)
        setLoadState("loaded")
      })
      .catch((error: unknown) => {
        if (!isActive) return
        setLoadError(billingErrorMessage(error))
        setLoadState("error")
      })
    return () => {
      isActive = false
    }
  }, [reloadKey])

  async function handleCheckout(plan: Exclude<Plan, "free">) {
    setPendingAction(`checkout:${plan}`)
    setActionError("")
    setMessage("")
    try {
      const response = await billingApi.checkout({ plan })
      window.sessionStorage.setItem("postup_billing_previous_plan", subscription?.plan ?? "free")
      window.location.href = response.url
    } catch (error) {
      setActionError(billingErrorMessage(error))
      setPendingAction("")
    }
  }

  async function handlePlanChange(plan: Plan) {
    const currentPlan = subscription?.plan
    if (!currentPlan || plan === currentPlan) return
    if (subscription.status !== "active" || currentPlan === "free") {
      if (plan !== "free") await handleCheckout(plan)
      return
    }
    const confirmed = window.confirm(
      `Change from ${currentPlan} to ${plan}? Your next invoice may include prorated charges or credits.`
    )
    if (!confirmed) return

    setPendingAction(`plan:${plan}`)
    setActionError("")
    setMessage("")
    try {
      await billingApi.changePlan({ plan })
      setMessage(`Plan changed to ${plan}.`)
      setReloadKey((key) => key + 1)
    } catch (error) {
      setActionError(billingErrorMessage(error))
    } finally {
      setPendingAction("")
    }
  }

  async function handleCancel() {
    if (!window.confirm("Cancel your subscription at the end of the current billing period? You will keep access until then.")) return
    setPendingAction("cancel")
    setActionError("")
    setMessage("")
    try {
      await billingApi.cancelAtPeriodEnd()
      setMessage("Your subscription will end at the close of this billing period.")
      setReloadKey((key) => key + 1)
    } catch (error) {
      setActionError(billingErrorMessage(error))
    } finally {
      setPendingAction("")
    }
  }

  async function handleResume() {
    setPendingAction("resume")
    setActionError("")
    setMessage("")
    try {
      await billingApi.resumeSubscription()
      setMessage("Subscription resumed.")
      setReloadKey((key) => key + 1)
    } catch (error) {
      setActionError(billingErrorMessage(error))
    } finally {
      setPendingAction("")
    }
  }

  async function handlePortal() {
    setPendingAction("portal")
    setActionError("")
    try {
      const response = await billingApi.portal()
      window.location.href = response.url
    } catch (error) {
      setActionError(billingErrorMessage(error))
      setPendingAction("")
    }
  }

  async function handleMockSubscribed() {
    const [updatedOverview, updatedSubscription, updatedInvoices, savedPaymentMethod] = await Promise.all([
      billingApi.getOverview(),
      billingApi.getSubscription(),
      billingApi.listInvoices(),
      billingApi.getPaymentMethod(),
    ])
    if (!updatedSubscription) throw new Error("The updated subscription could not be loaded.")
    setOverview(updatedOverview)
    setSubscription(updatedSubscription)
    setInvoices(updatedInvoices)
    setPaymentMethod(savedPaymentMethod)
    setShowPaymentForm(!savedPaymentMethod)
    setMessage(`Your ${updatedSubscription.plan} plan has been updated.`)
  }

  if (loadState === "loading") {
    return <p role="status" className="text-sm text-muted-foreground">Loading billing details...</p>
  }
  if (loadState === "error") {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-destructive">{loadError}</p>
        <Button type="button" variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
          <RefreshCw aria-hidden="true" /> Retry
        </Button>
      </div>
    )
  }
  if (!overview || !subscription) {
    if (!overview) {
      return <p role="status" className="text-sm text-muted-foreground">No billing details are available.</p>
    }

    return (
      <div className="space-y-6">
        {billingProvider === "mock" ? (
          showPaymentForm ? (
            <MockBillingForm key={mockPlan} plan={mockPlan} onSubscribed={handleMockSubscribed} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No subscription yet</CardTitle>
                <CardDescription>Add a payment method to get started.</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentMethod ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <p>{paymentMethod.brand} ending {paymentMethod.last4}</p>
                    <Button type="button" variant="outline" onClick={() => setShowPaymentForm(true)}>Replace card</Button>
                  </div>
                ) : null}
                {message ? <p role="status" className="text-sm text-green-700 dark:text-green-400">{message}</p> : null}
              </CardContent>
            </Card>
          )
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No subscription yet</CardTitle>
              <CardDescription>Choose a plan to add a payment method and get started.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button type="button" disabled={pendingAction !== ""} onClick={() => void handleCheckout("pro")}>
                {pendingAction === "checkout:pro" ? "Redirecting..." : "Choose Pro"}
              </Button>
              <Button type="button" variant="outline" disabled={pendingAction !== ""} onClick={() => void handleCheckout("agency")}>
                {pendingAction === "checkout:agency" ? "Redirecting..." : "Choose Agency"}
              </Button>
              {actionError ? <p role="alert" className="text-sm text-destructive">{actionError}</p> : null}
            </CardContent>
          </Card>
        )}
        <InvoiceHistory invoices={invoices} />
      </div>
    )
  }

  const currentPlan = subscription.plan
  const selectedMockPlan = mockPlan === currentPlan ? (currentPlan === "pro" ? "agency" : "pro") : mockPlan
  const canChangePlan = subscription.status === "active" && currentPlan !== "free"
  const trialMessage = subscription.status === "trialing"
    ? subscription.days_remaining !== null
      ? subscription.days_remaining <= 0
        ? "Your trial has ended."
        : `${subscription.days_remaining} ${subscription.days_remaining === 1 ? "day" : "days"} remaining in your trial.`
      : `Trial ends ${formattedDate(subscription.trial_ends_at)}.`
    : null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="capitalize">{subscription.plan} plan</CardTitle>
              <CardDescription className="capitalize">Status: {subscription.status.replaceAll("_", " ")}</CardDescription>
            </div>
            {billingProvider === "stripe" ? (
              <Button type="button" variant="outline" disabled={pendingAction !== ""} onClick={() => void handlePortal()}>
                {pendingAction === "portal" ? "Opening..." : "Manage payment method"}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-sm text-muted-foreground">Started</dt><dd className="mt-1 text-sm">{formattedDate(subscription.started_at)}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Next billing date</dt><dd className="mt-1 text-sm">{formattedDate(subscription.next_billing_date)}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Current period ends</dt><dd className="mt-1 text-sm">{formattedDate(subscription.current_period_end)}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Days remaining</dt><dd className="mt-1 text-sm">{subscription.days_remaining ?? "Not available"}</dd></div>
          </dl>
          {trialMessage ? <p role="status" className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">{trialMessage}</p> : null}
          {billingProvider === "mock" && paymentMethod ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
              <p>
                {paymentMethod.brand} ending {paymentMethod.last4}, expires{" "}
                {String(paymentMethod.exp_month).padStart(2, "0")}/{String(paymentMethod.exp_year).slice(-2)}
              </p>
              <Button type="button" variant="outline" disabled={pendingAction !== ""} onClick={() => setShowPaymentForm(true)}>
                Replace card
              </Button>
            </div>
          ) : null}
          {subscription.cancel_at_period_end ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <p>Your plan is set to end on {formattedDate(subscription.current_period_end)}.</p>
              <Button type="button" variant="outline" disabled={pendingAction !== ""} onClick={() => void handleResume()}>
                {pendingAction === "resume" ? "Resuming..." : "Resume subscription"}
              </Button>
            </div>
          ) : null}
          {message ? <p role="status" className="text-sm text-green-700 dark:text-green-400">{message}</p> : null}
          {actionError ? <p role="alert" className="text-sm text-destructive">{actionError}</p> : null}
          {!subscription.cancel_at_period_end && currentPlan !== "free" ? (
            <Button type="button" variant="outline" disabled={pendingAction !== ""} onClick={() => void handleCancel()}>
              {pendingAction === "cancel" ? "Canceling..." : billingProvider === "mock" ? "Cancel subscription" : "Cancel at period end"}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {billingProvider === "mock" && showPaymentForm ? (
        <MockBillingForm key={selectedMockPlan} plan={selectedMockPlan} onSubscribed={handleMockSubscribed} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Usage this period</CardTitle>
          <CardDescription>Current usage compared with your plan limits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <UsageMeter label="Connected accounts" usage={overview.usage.connected_accounts} />
          <UsageMeter label="Posts per month" usage={overview.usage.posts_per_month} />
          <UsageMeter label="AI generations per hour" usage={overview.usage.ai_generations_per_hour} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compare plans</CardTitle>
          <CardDescription>Select a plan for your publishing needs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th scope="col" className="py-3 pr-4 font-medium">Plan</th>
                  <th scope="col" className="py-3 pr-4 font-medium">Accounts</th>
                  <th scope="col" className="py-3 pr-4 font-medium">Posts / month</th>
                  <th scope="col" className="py-3 pr-4 font-medium">AI / hour</th>
                  <th scope="col" className="py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {planOptions.map((option) => {
                  const isCurrent = option.plan === currentPlan
                  const isBusy = pendingAction !== ""
                  return (
                    <tr key={option.plan} className="border-b last:border-0">
                      <th scope="row" className="py-3 pr-4 font-medium capitalize">{option.plan}{isCurrent ? " (current)" : ""}</th>
                      <td className="py-3 pr-4">{option.accounts}</td>
                      <td className="py-3 pr-4">{option.posts.toLocaleString()}</td>
                      <td className="py-3 pr-4">{option.ai}</td>
                      <td className="py-3 text-right">
                        {isCurrent ? (
                          <Button type="button" size="sm" variant="outline" disabled>Current plan</Button>
                        ) : billingProvider === "mock" && option.plan !== "free" ? (
                          <Button type="button" size="sm" variant="outline" disabled={isBusy} onClick={() => {
                            if (option.plan !== "free") setMockPlan(option.plan)
                          }}>
                            {selectedMockPlan === option.plan ? "Selected plan" : "Select plan"}
                          </Button>
                        ) : billingProvider === "mock" ? (
                          <Button type="button" size="sm" variant="outline" disabled>Unavailable</Button>
                        ) : !canChangePlan && option.plan !== "free" ? (
                          <Button type="button" size="sm" disabled={isBusy} onClick={() => void handleCheckout(option.plan as Exclude<Plan, "free">)}>
                            {pendingAction === `checkout:${option.plan}` ? "Redirecting..." : "Upgrade"}
                          </Button>
                        ) : !canChangePlan ? (
                          <Button type="button" size="sm" variant="outline" disabled>Unavailable</Button>
                        ) : (
                          <Button type="button" size="sm" variant="outline" disabled={isBusy} onClick={() => void handlePlanChange(option.plan)}>
                            {pendingAction === `plan:${option.plan}` ? "Changing..." : "Change plan"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <InvoiceHistory invoices={invoices} />
    </div>
  )
}

function InvoiceHistory({ invoices }: { invoices: Invoice[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
        <CardDescription>Billing history for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? <p className="text-sm text-muted-foreground">No invoices yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th scope="col" className="py-3 pr-4 font-medium">Date</th>
                  <th scope="col" className="py-3 pr-4 font-medium">Amount</th>
                  <th scope="col" className="py-3 pr-4 font-medium">Status</th>
                  <th scope="col" className="py-3 text-right font-medium">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">{formattedDate(invoice.date)}</td>
                    <td className="py-3 pr-4">{new Intl.NumberFormat(undefined, { style: "currency", currency: invoice.currency.toUpperCase() }).format(invoice.amount / 100)}</td>
                    <td className="py-3 pr-4 capitalize">{invoice.status.replaceAll("_", " ")}</td>
                    <td className="py-3 text-right">
                      {invoice.hosted_invoice_url ? <a href={invoice.hosted_invoice_url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">View invoice</a> : <span className="text-muted-foreground">Unavailable</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function UsageMeter({ label, usage }: { label: string; usage: UsageLimit }) {
  const percent = usage.limit === null || usage.limit <= 0
    ? 0
    : Math.min(100, Math.max(0, (usage.used / usage.limit) * 100))
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{usage.used.toLocaleString()} / {usage.limit === null ? "Unlimited" : usage.limit.toLocaleString()}</span>
      </div>
      {usage.limit !== null ? (
        <div className="h-2 overflow-hidden rounded-sm bg-muted" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={usage.limit} aria-valuenow={Math.min(usage.used, usage.limit)}>
          <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
      ) : null}
    </div>
  )
}
