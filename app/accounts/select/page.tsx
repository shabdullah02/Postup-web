"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthGate } from "@/components/AuthGate"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  listPendingSocialAccounts,
  selectSocialAccounts,
  type PendingSocialAccount,
} from "@/lib/api"

export default function SelectFacebookPagesPage() {
  return (
    <AuthGate>
      <PageSelector />
    </AuthGate>
  )
}

function PageSelector() {
  const router = useRouter()
  const [pendingAccounts, setPendingAccounts] = useState<PendingSocialAccount[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectionError, setSelectionError] = useState("")
  const submitInProgress = useRef(false)

  useEffect(() => {
    let isMounted = true
    listPendingSocialAccounts()
      .then((availableAccounts) => {
        if (!isMounted) return
        if (availableAccounts.length === 0) {
          router.replace("/accounts")
          return
        }
        setPendingAccounts(availableAccounts)
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load accounts to connect")
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [router])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitInProgress.current) return
    if (selectedIds.length === 0) {
      setSelectionError("Select at least one account to connect.")
      return
    }

    submitInProgress.current = true
    setIsSubmitting(true)
    setError("")
    setSelectionError("")

    try {
      await selectSocialAccounts(selectedIds)
      router.push("/accounts?fb_connected=1")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to connect the selected accounts")
      submitInProgress.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Select accounts</h1>
          <p className="text-muted-foreground">Choose the social accounts you want to connect.</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Available accounts</CardTitle>
            <CardDescription>Select one or more accounts for PostUp.</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="space-y-4">
                <p role="alert" className="text-sm text-destructive">{error}</p>
                <Button type="button" variant="outline" onClick={() => router.push("/accounts")}>Back to accounts</Button>
              </div>
            ) : isLoading ? (
              <p role="status" className="text-sm text-muted-foreground">Loading accounts...</p>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <fieldset disabled={isSubmitting} className="space-y-3">
                  <legend className="sr-only">Accounts to connect</legend>
                  {pendingAccounts.map((account) => {
                    const accountId = String(account.id)
                    return (
                      <label key={accountId} className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(accountId)}
                          onChange={(event) => {
                            setSelectionError("")
                            setSelectedIds((current) => event.target.checked
                              ? [...current, accountId]
                              : current.filter((id) => id !== accountId))
                          }}
                        />
                        <span>{account.name}</span>
                      </label>
                    )
                  })}
                </fieldset>
                {selectionError ? <p role="alert" className="text-sm text-destructive">{selectionError}</p> : null}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Connecting..." : "Connect selected accounts"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}