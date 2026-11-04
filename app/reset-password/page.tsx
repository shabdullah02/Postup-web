"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { confirmPasswordReset } from "@/lib/api"

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6" role="status">Loading reset form...</main>}>
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const uid = searchParams.get("uid")
  const token = searchParams.get("token")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (!uid || !token) {
      setError("This reset link is incomplete. Request a new one.")
      return
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)
    try {
      await confirmPasswordReset({ uid, token, new_password: password })
      setSubmitted(true)
      setPassword("")
      setConfirmPassword("")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reset your password.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasToken = Boolean(uid && token)

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-5 py-14">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{submitted ? "Password updated" : "Choose a new password"}</CardTitle>
          <CardDescription>
            {submitted ? "Your password has been changed." : "Choose a new password for your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4" role="status">
              <Link href="/login" className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Go to login</Link>
            </div>
          ) : !hasToken ? (
            <div className="space-y-4">
              <p role="status" className="text-sm">This reset link is incomplete or expired. Request a new one.</p>
              <Link href="/forgot-password" className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Request another link</Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="new-password" className="text-sm font-medium">New password</label>
                <Input
                  id="new-password"
                  name="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirm-password" className="text-sm font-medium">Confirm new password</label>
                <Input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>
              {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
