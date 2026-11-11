"use client"

import { Suspense, useEffect, useState } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { ThreadsIcon } from "@hugeicons/core-free-icons"
import { AuthGate } from "@/components/AuthGate"
import { useAuth } from "@/components/AuthProvider"
import {
  facebookConnectUrl,
  getThreadsAuthorizationUrl,
  instagramConnectUrl,
  deleteAccount,
  listAccounts,
  listPendingSocialAccounts,
  type Account,
} from "@/lib/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  accountDisplayName,
  accountReauthWarning,
  facebookErrors,
  providerLabel,
  threadsErrors,
} from "@/lib/social"

type FacebookError = keyof typeof facebookErrors
type CallbackNotice =
  | { type: "success"; provider: "facebook" | "threads" }
  | { type: "error"; provider: "facebook" | "threads"; message: string }

export default function AccountsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6">Loading accounts...</main>}>
      <AccountsPageContent />
    </Suspense>
  )
}

function AccountsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const requiresEmailVerification = Boolean(user && !user.is_superuser && !user.email_verified)
  const [selectionError, setSelectionError] = useState("")
  const [threadsConnectError, setThreadsConnectError] = useState("")
  const [isThreadsConnecting, setIsThreadsConnecting] = useState(false)
  const errorParam = searchParams.get("fb_error")
  const threadsErrorParam = searchParams.get("threads_error")
  const initialNotice: CallbackNotice | null = searchParams.get("fb_connected") === "1"
    ? { type: "success", provider: "facebook" }
    : errorParam && errorParam in facebookErrors
      ? { type: "error", provider: "facebook", message: facebookErrors[errorParam as FacebookError] }
      : searchParams.get("threads_connected") === "1"
        ? { type: "success", provider: "threads" }
        : threadsErrorParam
          ? {
            type: "error",
            provider: "threads",
            message: threadsErrors[threadsErrorParam] ?? "Threads could not be connected. Try again.",
          }
          : null
  const [notice] = useState(initialNotice)
  const refreshAfterCallback = searchParams.has("fb_connected")
    || searchParams.has("fb_error")
    || searchParams.has("threads_connected")
    || searchParams.has("threads_error")

  useEffect(() => {
    if (refreshAfterCallback) {
      router.replace("/accounts")
    }
  }, [refreshAfterCallback, router])

  async function connectThreads() {
    setThreadsConnectError("")
    setIsThreadsConnecting(true)
    try {
      window.location.href = await getThreadsAuthorizationUrl()
    } catch (requestError) {
      setThreadsConnectError(requestError instanceof Error
        ? requestError.message
        : "Unable to start Threads connection. Try again.")
      setIsThreadsConnecting(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    listPendingSocialAccounts()
      .then((pendingAccounts) => {
        if (isMounted && pendingAccounts.length > 0) router.replace("/accounts/select")
      })
      .catch((requestError) => {
        if (isMounted) {
          setSelectionError(requestError instanceof Error ? requestError.message : "Unable to check for accounts to connect")
        }
      })

    return () => {
      isMounted = false
    }
  }, [router])

  return (
    <AuthGate>
      <main className="min-h-screen p-6">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <header>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">Accounts</h1>
                <p className="text-muted-foreground">Connected social accounts.</p>
              </div>
              <span className="inline-flex" title={requiresEmailVerification ? "Verify your email before connecting an account." : undefined}>
                <Button type="button" disabled={requiresEmailVerification} onClick={() => { window.location.href = facebookConnectUrl() }}>
                  Connect Facebook
                </Button>
              </span>
              <span className="inline-flex" title={requiresEmailVerification ? "Verify your email before connecting an account." : undefined}>
                <Button type="button" variant="outline" disabled={requiresEmailVerification} onClick={() => { window.location.href = instagramConnectUrl() }}>
                  Connect Instagram
                </Button>
              </span>
              <span className="inline-flex" title={requiresEmailVerification ? "Verify your email before connecting an account." : undefined}>
                <Button
                  type="button"
                  variant="outline"
                  disabled={requiresEmailVerification || isThreadsConnecting}
                  onClick={() => void connectThreads()}
                >
                  <HugeiconsIcon icon={ThreadsIcon} size={16} aria-hidden="true" />
                  {isThreadsConnecting ? "Connecting..." : "Connect Threads"}
                </Button>
              </span>
            </div>
          </header>

          {notice?.type === "error" ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-primary/30 bg-muted p-4 text-sm">
              <p>{notice.message}</p>
              {notice.provider === "facebook" ? (
                <span className="inline-flex" title={requiresEmailVerification ? "Verify your email before connecting an account." : undefined}>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={requiresEmailVerification}
                    onClick={() => {
                      window.location.href = notice.message === facebookErrors.no_instagram_accounts
                        ? instagramConnectUrl()
                        : facebookConnectUrl()
                    }}
                  >
                    Try again
                  </Button>
                </span>
              ) : (
                <Button type="button" variant="outline" disabled={requiresEmailVerification || isThreadsConnecting} onClick={() => void connectThreads()}>
                  Try again
                </Button>
              )}
            </div>
          ) : notice?.type === "success" ? (
            <p role="status" className="rounded-md border border-border bg-muted p-4 text-sm">
              {notice.provider === "threads" ? "Threads account connected." : "Account connected."}
            </p>
          ) : null}

          {threadsConnectError ? <p role="alert" className="text-sm text-destructive">{threadsConnectError}</p> : null}
          {selectionError ? <p role="alert" className="text-sm text-destructive">{selectionError}</p> : null}
          <AccountList refreshAfterCallback={refreshAfterCallback} />
        </div>
      </main>
    </AuthGate>
  )
}

function AccountList({ refreshAfterCallback }: { refreshAfterCallback: boolean }) {
  const { user } = useAuth()
  const requiresEmailVerification = Boolean(user && !user.is_superuser && !user.email_verified)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loadError, setLoadError] = useState("")
  const [removeError, setRemoveError] = useState("")
  const [removingAccountId, setRemovingAccountId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    listAccounts()
      .then((loadedAccounts) => {
        if (isMounted) setAccounts(loadedAccounts)
      })
      .catch((requestError) => {
        if (isMounted) {
          setLoadError(requestError instanceof Error ? requestError.message : "Unable to load accounts")
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [refreshAfterCallback])

  if (isLoading) return <p>Loading accounts...</p>

  async function handleRemove(account: Account) {
    const displayName = accountDisplayName(account)
    const confirmMessage = account.provider === "threads"
      ? `Disconnect ${displayName}?`
      : `Remove ${account.name}? Its draft and posted history will be deleted too.`
    if (!window.confirm(confirmMessage)) return
    setRemoveError("")
    setRemovingAccountId(account.id)
    try {
      await deleteAccount(account.id)
      setAccounts((currentAccounts) => currentAccounts.filter(({ id }) => id !== account.id))
    } catch (requestError) {
      setRemoveError(requestError instanceof Error ? requestError.message : "Unable to remove account.")
    } finally {
      setRemovingAccountId(null)
    }
  }

  if (loadError) return <p role="alert" className="text-sm text-destructive">{loadError}</p>

  return (
    <div className="space-y-4">
      {removeError ? <p role="alert" className="text-sm text-destructive">{removeError}</p> : null}
      {accounts.length === 0 ? (
        <p className="text-muted-foreground">No accounts connected.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {account.provider === "threads" ? <ThreadsAvatar account={account} /> : null}
                    <CardTitle className="truncate">{accountDisplayName(account)}</CardTitle>
                  </div>
                  <Badge variant="outline">{providerLabel(account.provider)}</Badge>
                </div>
                <CardDescription>Status: {account.status.replace("_", " ")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Connected {new Date(account.connected_at).toLocaleDateString()}
                  </p>
                  {accountReauthWarning(account) ? (
                    <p role="alert" className="text-sm text-muted-foreground">
                      {accountReauthWarning(account)}
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    {account.status === "needs_reauth" && account.provider === "facebook" ? (
                      <span className="inline-flex" title={requiresEmailVerification ? "Verify your email before connecting an account." : undefined}>
                        <Button type="button" size="sm" disabled={requiresEmailVerification || removingAccountId !== null} onClick={() => { window.location.href = facebookConnectUrl(account.id) }}>
                          Reconnect
                        </Button>
                      </span>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={removingAccountId !== null}
                      onClick={() => void handleRemove(account)}
                    >
                      {removingAccountId === account.id
                        ? account.provider === "threads" ? "Disconnecting..." : "Removing..."
                        : account.provider === "threads" ? "Disconnect" : "Remove"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function ThreadsAvatar({ account }: { account: Account }) {
  const [imageFailed, setImageFailed] = useState(false)
  const imageUrl = account.threads_profile_picture_url ?? account.profile_picture_url ?? account.avatar_url
  const initials = accountDisplayName(account).replace(/^@/, "").slice(0, 2).toUpperCase() || "T"

  return (
    <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold text-muted-foreground">
      {imageUrl && !imageFailed ? (
        <Image
          src={imageUrl}
          alt=""
          width={40}
          height={40}
          unoptimized
          className="absolute inset-0 size-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : initials}
    </span>
  )
}
