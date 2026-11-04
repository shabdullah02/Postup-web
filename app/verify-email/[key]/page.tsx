"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ApiError, resendVerification, verifyEmail } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type VerificationState = "loading" | "success" | "error"

export default function VerifyEmailKeyPage() {
  const params = useParams<{ key: string }>()
  const token = decodeURIComponent(params.key)
  const [state, setState] = useState<VerificationState>("loading")
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState("")
  const requestedTokens = useRef(new Set<string>())
  const activeToken = useRef(token)

  useEffect(() => {
    activeToken.current = token
    if (requestedTokens.current.has(token)) return

    requestedTokens.current.add(token)
    setState("loading")
    setResendMessage("")
    verifyEmail({ token })
      .then(() => {
        if (activeToken.current === token) setState("success")
      })
      .catch(() => {
        if (activeToken.current === token) setState("error")
      })
  }, [token])

  async function handleResend() {
    setIsResending(true)
    setResendMessage("")
    try {
      await resendVerification()
      setResendMessage("Verification email sent. Check your inbox.")
    } catch (requestError) {
      setResendMessage(
        requestError instanceof ApiError && requestError.code === "throttled"
          ? "Too many attempts, try later."
          : requestError instanceof Error
            ? requestError.message
            : "Unable to resend the verification email."
      )
    } finally {
      setIsResending(false)
    }
  }

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
            <div className="space-y-4">
              <p role="status" className="text-sm">Email verified</p>
              <Link href="/login" className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Go to login
              </Link>
            </div>
          ) : null}
          {state === "error" ? (
            <div className="space-y-4">
              <p role="alert" className="text-sm text-destructive">This verification link is invalid or expired.</p>
              {resendMessage ? <p role="status" className="text-sm">{resendMessage}</p> : null}
              <Button type="button" className="w-full" disabled={isResending} onClick={handleResend}>
                {isResending ? "Sending..." : "Resend verification email"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
