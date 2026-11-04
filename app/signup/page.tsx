"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ApiError, register } from "@/lib/api"

type SignupField = "username" | "email" | "password"
type FieldErrors = Partial<Record<SignupField | "confirmPassword" | "terms", string>>

function passwordStrength(password: string) {
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password) || /[^a-zA-Z0-9]/.test(password)) score += 1
  return score < 2 ? "Weak" : score < 4 ? "Fair" : "Strong"
}

export default function SignupPage() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registered, setRegistered] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: FieldErrors = {}
    if (username.trim().length < 3) nextErrors.username = "Use at least 3 characters for your username."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = "Enter a valid email address."
    if (password.length < 8) nextErrors.password = "Use at least 8 characters for your password."
    if (password !== confirmPassword) nextErrors.confirmPassword = "Passwords do not match."
    if (!acceptedTerms) nextErrors.terms = "Accept the terms to create an account."
    setFieldErrors(nextErrors)
    setError("")
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      await register(username.trim(), email.trim(), password)
      setRegistered(true)
      setPassword("")
      setConfirmPassword("")
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.payload) {
        const serverErrors: FieldErrors = {}
        for (const field of ["username", "email", "password"] as const) {
          const value = requestError.fieldErrors?.[field]?.[0] ?? requestError.payload[field]
          if (typeof value === "string") serverErrors[field] = value
          else if (Array.isArray(value) && typeof value[0] === "string") serverErrors[field] = value[0]
        }
        setFieldErrors(serverErrors)
      }
      setError(requestError instanceof Error ? requestError.message : "Unable to create your account.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-5 py-14">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">{registered ? "Check your email" : "Create your account"}</CardTitle>
          <CardDescription>
            {registered ? "Your account is ready for verification." : "Start organizing your publishing workflow."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {registered ? (
            <div className="space-y-4" role="status">
              <p className="text-sm">We sent a verification link to {email.trim() || "your email address"}. Verify your email before signing in.</p>
              <Link href="/login" className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Continue to login
              </Link>
            </div>
          ) : (
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {error ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
            <div className="space-y-2">
              <label htmlFor="signup-username" className="text-sm font-medium">Username</label>
              <Input id="signup-username" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} aria-invalid={Boolean(fieldErrors.username)} aria-describedby={fieldErrors.username ? "signup-username-error" : undefined} required />
              {fieldErrors.username ? <p id="signup-username-error" className="text-sm text-destructive">{fieldErrors.username}</p> : null}
            </div>
            <div className="space-y-2">
              <label htmlFor="signup-email" className="text-sm font-medium">Email</label>
              <Input id="signup-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "signup-email-error" : undefined} required />
              {fieldErrors.email ? <p id="signup-email-error" className="text-sm text-destructive">{fieldErrors.email}</p> : null}
            </div>
            <div className="space-y-2">
              <label htmlFor="signup-password" className="text-sm font-medium">Password</label>
              <Input id="signup-password" name="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(fieldErrors.password)} aria-describedby="password-strength signup-password-error" required />
              <p id="password-strength" className="text-xs text-muted-foreground">Password strength: {password ? passwordStrength(password) : "Enter a password"}. Use 8 or more characters.</p>
              {fieldErrors.password ? <p id="signup-password-error" className="text-sm text-destructive">{fieldErrors.password}</p> : null}
            </div>
            <div className="space-y-2">
              <label htmlFor="signup-confirm-password" className="text-sm font-medium">Confirm password</label>
              <Input id="signup-confirm-password" name="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} aria-invalid={Boolean(fieldErrors.confirmPassword)} aria-describedby={fieldErrors.confirmPassword ? "confirm-password-error" : undefined} required />
              {fieldErrors.confirmPassword ? <p id="confirm-password-error" className="text-sm text-destructive">{fieldErrors.confirmPassword}</p> : null}
            </div>
            <div>
              <label className="flex items-start gap-2 text-sm leading-5">
                <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} aria-invalid={Boolean(fieldErrors.terms)} className="mt-1 accent-primary" />
                <span>I agree to the <Link href="/terms" className="underline underline-offset-4">Terms of Service</Link> and <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link>.</span>
              </label>
              {fieldErrors.terms ? <p className="mt-1 text-sm text-destructive">{fieldErrors.terms}</p> : null}
            </div>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">Already have an account? <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">Log in</Link></p>
          </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
