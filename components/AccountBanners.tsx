"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"
import { Button } from "@/components/ui/button"
import { ApiError, getSubscription, listSocialAccounts, pollForPlanChange, resendVerification } from "@/lib/api"
import type { Plan, Subscription } from "@/lib/api-types"

type SubscriptionState = "loading" | "loaded" | "error"

function subscriptionNotice(subscription: Subscription): string | null {
  if (subscription.status === "past_due") return "Your subscription payment is past due. Update your billing details to avoid interruption."
  if (subscription.status === "trialing") {
    if (subscription.days_remaining !== null) {
      return subscription.days_remaining <= 0
        ? "Your trial has ended. Choose a plan to continue."
        : `Your trial ends in ${subscription.days_remaining} ${subscription.days_remaining === 1 ? "day" : "days"}.`
    }
    return subscription.trial_ends_at
      ? `Your trial ends on ${new Date(subscription.trial_ends_at).toLocaleDateString()}.`
      : "Your account is in a trial period."
  }
  if (subscription.cancel_at_period_end || (subscription.days_remaining !== null && subscription.days_remaining <= 7)) {
    return subscription.current_period_end
      ? `Your subscription expires on ${new Date(subscription.current_period_end).toLocaleDateString()}.`
      : "Your subscription is nearing its end."
  }
  if (subscription.status === "canceled") return "Your subscription has expired. Choose a plan to restore access."
  return null
}

export default function AccountBanners() {
  const pathname = usePathname()
  const { user, isLoading: isAuthLoading } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>("loading")
  const [reloadKey, setReloadKey] = useState(0)
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState("")
  const [resendError, setResendError] = useState("")
  const [billingToast, setBillingToast] = useState("")

  useEffect(() => {
    if (pathname !== "/accounts" || isAuthLoading || !user || user.is_superuser) return
    const url = new URL(window.location.href)
    const result = url.searchParams.get("billing")
    if (result !== "success" && result !== "canceled") return

    setBillingToast(result === "success" ? "Payment received. Confirming your plan..." : "Checkout canceled.")
    url.searchParams.delete("billing")
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`)

    let isActive = true
    if (result === "success") {
      const savedPlan = window.sessionStorage.getItem("postup_billing_previous_plan") as Plan | null
      window.sessionStorage.removeItem("postup_billing_previous_plan")
      pollForPlanChange(savedPlan ?? "free")
        .then(async (updatedSubscription) => {
          if (!isActive) return
          if (!updatedSubscription) {
            setBillingToast("Payment received. Your plan update is still processing.")
            return
          }
          try {
            await listSocialAccounts()
          } catch {
            // The subscription update is confirmed independently of account refresh.
          }
          if (!isActive) return
          setReloadKey((key) => key + 1)
          setBillingToast(`Payment successful. Your plan is now ${updatedSubscription.plan}.`)
        })
        .catch(() => {
          if (isActive) setBillingToast("Payment received, but we could not confirm the plan update yet.")
        })
    } else {
      window.sessionStorage.removeItem("postup_billing_previous_plan")
      listSocialAccounts().catch(() => undefined)
    }

    return () => {
      isActive = false
    }
  }, [isAuthLoading, pathname, user])

  useEffect(() => {
    if (isAuthLoading || !user || user.is_superuser) return
    let isActive = true
    setSubscriptionState("loading")
    getSubscription()
      .then((value) => {
        if (!isActive) return
        setSubscription(value)
        setSubscriptionState("loaded")
      })
      .catch(() => {
        if (isActive) setSubscriptionState("error")
      })
    return () => {
      isActive = false
    }
  }, [isAuthLoading, reloadKey, user])

  async function handleResend() {
    setIsResending(true)
    setResendMessage("")
    setResendError("")
    try {
      await resendVerification()
      setResendMessage("Verification email sent. Check your inbox.")
    } catch (requestError) {
      setResendError(
        requestError instanceof ApiError && requestError.code === "throttled"
          ? "Too many attempts, try later"
          : requestError instanceof Error
            ? requestError.message
            : "Unable to resend the verification email."
      )
    } finally {
      setIsResending(false)
    }
  }

  if (isAuthLoading || !user || user.is_superuser) return null

  const billingNotice = subscription ? subscriptionNotice(subscription) : null

  return (
    <div className="space-y-2">
      {billingToast ? <p role="status" className="border-b border-border bg-muted px-4 py-3 text-sm">{billingToast}</p> : null}
      {!user.email_verified ? (
        <section className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/30 bg-muted px-4 py-3 text-sm" aria-label="Email verification">
          <div>
            <p className="font-medium">Verify your email address to access all account features.</p>
            {resendMessage ? <p role="status" className="mt-1">{resendMessage}</p> : null}
            {resendError ? <p role="alert" className="mt-1 text-destructive">{resendError}</p> : null}
          </div>
          <Button type="button" size="sm" variant="outline" disabled={isResending} onClick={handleResend}>
            {isResending ? "Sending..." : "Resend verification email"}
          </Button>
        </section>
      ) : null}

      {subscriptionState === "loading" ? (
        <p role="status" className="border-b px-4 py-2 text-sm text-muted-foreground">Loading subscription status...</p>
      ) : null}
      {subscriptionState === "loaded" && billingNotice ? (
        <section className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/30 bg-muted px-4 py-3 text-sm" aria-label="Subscription notice">
          <p>{billingNotice}</p>
          <Link href="/billing" className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">Manage billing</Link>
        </section>
      ) : null}
    </div>
  )
}
