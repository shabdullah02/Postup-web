"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AuthGate } from "@/components/AuthGate"
import { facebookConnectUrl } from "@/lib/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { listAccounts, type Account } from "@/lib/api"

const facebookErrors = {
  no_pages: "No Facebook Page found on this account.",
  permissions_declined: "Posting permissions were declined. Connect again and approve all permissions.",
  page_not_available: "This Facebook account cannot manage that Page.",
} as const

type FacebookError = keyof typeof facebookErrors

export default function AccountsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6">Loading accounts...</main>}>
      <AccountsPageContent />
    </Suspense>
  )
}

function AccountsPageContent() {
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const errorParam = searchParams.get("fb_error")
  const facebookError = errorParam && errorParam in facebookErrors
    ? errorParam as FacebookError
    : null
  const facebookConnected = searchParams.get("fb_connected") === "1"

  useEffect(() => {
    async function loadAccounts() {
      try {
        setError("")
        setAccounts(await listAccounts())
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to load accounts")
      } finally {
        setIsLoading(false)
      }
    }

    void loadAccounts()
  }, [])

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
              <Button type="button" onClick={() => window.location.assign(facebookConnectUrl())}>
                Connect Facebook
              </Button>
            </div>
          </header>

          {facebookError === "no_pages" ? (
            <p role="alert" className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
              No Facebook Page found on this account. Create a Page (<a className="underline" href="https://www.facebook.com/pages/create" target="_blank" rel="noreferrer">https://www.facebook.com/pages/create</a>), then click Connect again. When connecting, select your Page in the Facebook dialog.
            </p>
          ) : facebookError ? (
            <p role="alert" className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
              {facebookErrors[facebookError]}
            </p>
          ) : facebookConnected ? (
            <p role="status" className="rounded-md border border-green-600/30 bg-green-600/10 p-4 text-sm">
              Facebook connected.
            </p>
          ) : null}

          {accounts.some((account) => account.status === "needs_reauth") ? (
            <p role="alert" className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
              One or more accounts need to be reconnected before they can be used.
            </p>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {isLoading ? (
            <p>Loading accounts...</p>
          ) : accounts.length === 0 ? (
            <p className="text-muted-foreground">No accounts connected.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => (
                <Card key={account.id}>
                  <CardHeader>
                    <CardTitle>{account.name}</CardTitle>
                    <CardDescription>{account.provider}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">External ID: {account.external_id}</p>
                      <p className="text-sm text-muted-foreground">Status: {account.status}</p>
                      {account.status === "needs_reauth" ? (
                        <Button type="button" size="sm" onClick={() => window.location.assign(facebookConnectUrl(account.id))}>
                          Reconnect
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </AuthGate>
  )
}
