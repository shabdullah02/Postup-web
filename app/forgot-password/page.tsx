"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { requestPasswordReset } from "@/lib/api"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      await requestPasswordReset({ email: email.trim() })
      setSubmitted(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to submit your request. Try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-5 py-14">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{submitted ? "Check your email" : "Reset your password"}</CardTitle>
          <CardDescription>
            {submitted ? "If an account matches that address, you will receive a reset link." : "Enter the email address associated with your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4" role="status">
              <p className="text-sm">If an account matches that address, you will receive a reset link.</p>
              <Link href="/login" className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Return to login</Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="reset-email" className="text-sm font-medium">Email</label>
                <Input
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send reset link"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="text-foreground underline-offset-4 hover:underline">Return to login</Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
