"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthGate } from "@/components/AuthGate"
import { useAuth } from "@/components/AuthProvider"
import {
  facebookConnectUrl,
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
import { accountReauthWarning, facebookErrors, providerLabel } from "@/lib/social"

type FacebookError = keyof typeof facebookErrors
type CallbackNotice = { type: "success" } | { type: "error"; code: FacebookError }

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
  const errorParam = searchParams.get("fb_error")
  const initialNotice: CallbackNotice | null = searchParams.get("fb_connected") === "1"
    ? { type: "success" }
    : errorParam && errorParam in facebookErrors
      ? { type: "error", code: errorParam as FacebookError }
      : null
  const [notice] = useState(initialNotice)

  useEffect(() => {
    if (searchParams.has("fb_connected") || searchParams.has("fb_error")) {
      router.replace("/accounts")
    }
  }, [router, searchParams])

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
            </div>
          </header>

          {notice?.type === "error" ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
              <p>{facebookErrors[notice.code]}</p>
              <span className="inline-flex" title={requiresEmailVerification ? "Verify your email before connecting an account." : undefined}>
                <Button
                  type="button"
                  variant="outline"
                  disabled={requiresEmailVerification}
                  onClick={() => {
                    window.location.href = notice.code === "no_instagram_accounts"
                      ? instagramConnectUrl()
                      : facebookConnectUrl()
                  }}
                >
                  Try again
                </Button>
              </span>
            </div>
          ) : notice?.type === "success" ? (
            <p role="status" className="rounded-md border border-green-600/30 bg-green-600/10 p-4 text-sm">
              Account connected.
            </p>
          ) : null}

          {selectionError ? <p role="alert" className="text-sm text-destructive">{selectionError}</p> : null}
          <AccountList />
        </div>
      </main>
    </AuthGate>
  )
}

function AccountList() {
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
  }, [])

  if (isLoading) return <p>Loading accounts...</p>

  async function handleRemove(account: Account) {
    if (!window.confirm(`Remove ${account.name}? Its draft and posted history will be deleted too.`)) return
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
                  <CardTitle>{account.name}</CardTitle>
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
                    <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">
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
                      {removingAccountId === account.id ? "Removing..." : "Remove"}
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
