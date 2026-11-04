"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { verifyEmail } from "@/lib/api"

type VerificationState = "loading" | "success" | "error" | "missing"

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6" role="status">Loading verification...</main>}>
      <VerifyEmailContent />
    </Suspense>
  )
}

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [verification, setVerification] = useState<{ token: string | null; state: VerificationState }>({
    token,
    state: token ? "loading" : "missing",
  })
  const [error, setError] = useState("")
  const requestedTokens = useRef(new Set<string>())
  const activeToken = useRef(token)
  const state = verification.token === token ? verification.state : token ? "loading" : "missing"

  useEffect(() => {
    activeToken.current = token
    if (!token || requestedTokens.current.has(token)) return

    requestedTokens.current.add(token)
    verifyEmail({ token })
      .then(() => {
        if (activeToken.current === token) {
          setVerification({ token, state: "success" })
        }
      })
      .catch((requestError: unknown) => {
        if (activeToken.current !== token) return
        setError(requestError instanceof Error ? requestError.message : "Unable to verify this email.")
        setVerification({ token, state: "error" })
      })
  }, [token])

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-5 py-14">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>Confirm the email address linked to your Postup account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "loading" ? <p role="status" className="text-sm">Verifying your email...</p> : null}
          {state === "success" ? (
            <div className="space-y-4" role="status">
              <p className="text-sm">Your email is verified. You can now sign in.</p>
              <Link href="/login" className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Go to login</Link>
            </div>
          ) : null}
          {state === "missing" ? <p role="status" className="text-sm">This verification link is missing its token. Request a new email from your account.</p> : null}
          {state === "error" ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </main>
  )
}
