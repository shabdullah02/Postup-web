"use client"

import { useEffect, useState } from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/AuthProvider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent, 
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ApiError, login, loginWithTwoFactor } from "@/lib/api"

function safeNextPath(value: string | null): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/dashboard"
  try {
    const target = new URL(value, "http://postup.local")
    return target.origin === "http://postup.local" ? `${target.pathname}${target.search}${target.hash}` : "/dashboard"
  } catch {
    return "/dashboard"
  }
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6" role="status">Loading login...</main>}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = safeNextPath(searchParams.get("next"))
  const { user, isLoading, refresh } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const [useRecoveryCode, setUseRecoveryCode] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(nextPath)
    }
  }, [isLoading, nextPath, router, user])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      if (twoFactorRequired) {
        const code = verificationCode.trim()
        if (!code) {
          setError(useRecoveryCode ? "Enter a recovery code." : "Enter your authentication code.")
          return
        }
        await loginWithTwoFactor(useRecoveryCode ? { recovery_code: code } : { code })
      } else {
        const result = await login(username, password)
        if ("two_factor_required" in result) {
          setTwoFactorRequired(true)
          setPassword("")
          return
        }
      }
      setVerificationCode("")
      await refresh()
      router.replace(nextPath)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === "account_suspended") {
        setError("This account is suspended. Contact support for help.")
      } else if (requestError instanceof ApiError && requestError.code === "account_deactivated") {
        setError("This account is deactivated. Contact support for help.")
      } else {
        setError(requestError instanceof Error ? requestError.message : "Login failed")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || user) {
    return null
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>Sign in to manage your posts.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {!twoFactorRequired ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="username">Username</label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password">Password</label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <p className="text-right text-sm">
                    <Link href="/forgot-password" className="text-primary underline-offset-4 hover:underline">
                      Forgot password?
                    </Link>
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {useRecoveryCode ? "Enter one of your recovery codes." : "Enter the code from your authenticator app."}
                </p>
                <Input
                  id="two-factor-code"
                  name="two-factor-code"
                  type="text"
                  inputMode={useRecoveryCode ? "text" : "numeric"}
                  autoComplete="one-time-code"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => {
                    setUseRecoveryCode((value) => !value)
                    setVerificationCode("")
                    setError("")
                  }}
                >
                  {useRecoveryCode ? "Use an authenticator code" : "Use a recovery code"}
                </Button>
              </div>
            )}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging in..." : twoFactorRequired ? "Verify and log in" : "Log in"}
            </Button>
            {twoFactorRequired ? (
              <Button
                className="w-full"
                type="button"
                variant="ghost"
                disabled={isSubmitting}
                onClick={() => {
                  setTwoFactorRequired(false)
                  setUseRecoveryCode(false)
                  setVerificationCode("")
                  setError("")
                }}
              >
                Back to password
              </Button>
            ) : null}
            <p className="text-center text-sm text-muted-foreground">New to Postup? <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">Create an account</Link></p>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
