"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { X } from "lucide-react"
import { useBilling } from "@/components/BillingProvider"
import { Button } from "@/components/ui/button"

export function SubscriptionStatusBanner() {
  const { billing } = useBilling()
  const status = billing?.status.toLowerCase()
  if (!status || !["past_due", "suspended", "canceled", "cancelled"].includes(status)) return null

  const message = status === "past_due"
    ? "Your payment is past due. Update your billing details to keep your plan active."
    : status === "suspended"
      ? "Your subscription is suspended. Review billing to restore paid features."
      : "Your subscription has ended. Choose a plan to restore paid features."

  return (
    <aside role="status" className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-600/30 bg-amber-500/10 px-5 py-3 text-sm">
      <p>{message}</p>
      <Link href="/billing" className="font-semibold underline underline-offset-4">Review billing</Link>
    </aside>
  )
}

export function PlanLimitPrompt() {
  const [message, setMessage] = useState("")

  useEffect(() => {
    function handlePlanLimit(event: Event) {
      const detail = (event as CustomEvent<unknown>).detail
      setMessage(typeof detail === "string" ? detail : "You’ve reached the limit for your current plan.")
    }
    window.addEventListener("postup:plan-limit", handlePlanLimit)
    return () => window.removeEventListener("postup:plan-limit", handlePlanLimit)
  }, [])

  if (!message) return null

  return (
    <div role="alert" className="fixed bottom-5 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-start gap-4 rounded-xl border border-border bg-background p-4 shadow-xl">
      <p className="flex-1 text-sm leading-6">{message}</p>
      <Button type="button" size="icon" variant="ghost" aria-label="Dismiss plan limit message" onClick={() => setMessage("")}><X aria-hidden="true" /></Button>
      <Link href="/billing" className="shrink-0 text-sm font-semibold text-primary underline underline-offset-4">Upgrade</Link>
    </div>
  )
}