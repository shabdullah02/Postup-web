"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Check, Gem, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/AuthProvider"
import { content } from "@/lib/content"

type BillingInterval = "monthly" | "yearly"

const planAccents = {
  free: {
    strip: "bg-muted-foreground/50",
    label: "text-muted-foreground",
    icon: "border-muted-foreground/40 text-muted-foreground",
    check: "border-muted-foreground/50 text-muted-foreground",
    tint: "bg-muted/30",
  },
  pro: {
    strip: "bg-primary",
    label: "text-primary",
    icon: "border-primary/40 text-primary",
    check: "border-primary/50 text-primary",
    tint: "bg-primary/5",
  },
  agency: {
    strip: "bg-primary/60",
    label: "text-primary/80",
    icon: "border-primary/30 text-primary/80",
    check: "border-primary/40 text-primary/80",
    tint: "bg-primary/[0.03]",
  },
} as const

export default function PricingSection() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [interval, setInterval] = useState<BillingInterval>("yearly")

  function choosePlan(plan: string) {
    if (isLoading) return
    const billingPath = `/billing?plan=${encodeURIComponent(plan)}`
    router.push(user ? billingPath : `/login?next=${encodeURIComponent(billingPath)}`)
  }

  return (
    <section id="pricing" className="scroll-mt-24 border-y border-border bg-muted/30 px-5 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">Start small. Grow when you need to.</h2>
          <p className="mt-4 text-muted-foreground">Plan details are centralized in the site content and can be adjusted as packaging is finalized.</p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-y border-border py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center rounded-md border border-border bg-background p-1" role="group" aria-label="Billing interval">
              <button
                type="button"
                aria-pressed={interval === "yearly"}
                onClick={() => setInterval("yearly")}
                className={`rounded px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${interval === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Yearly
              </button>
              <button
                type="button"
                aria-pressed={interval === "monthly"}
                onClick={() => setInterval("monthly")}
                className={`rounded px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${interval === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Monthly
              </button>
            </div>
            {interval === "yearly" ? (
              <>
                <span className="rounded border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">20% OFF · ENDS SOON</span>
                <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">2 MONTHS FREE</span>
              </>
            ) : null}
          </div>
          <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">PRICES IN USD</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-0 lg:grid-cols-3">
          {content.marketing.plans.map((plan, index) => {
            const accent = planAccents[plan.id as keyof typeof planAccents]
            const isYearlyPaidPlan = interval === "yearly" && plan.monthly > 0
            const displayPrice = interval === "yearly" ? plan.annual : plan.monthly
            const billedYearly = plan.annual * 12
            const yearlySavings = (plan.monthly - plan.annual) * 12
            const planLabel = plan.id === "pro" ? "MOST POPULAR" : plan.id === "agency" ? "BEST VALUE" : "PLAN"
            const PlanIcon = plan.id === "pro" ? Star : plan.id === "agency" ? Gem : null
            const actionLabel = plan.id === "free" ? "START FREE" : `GET ${plan.name.toUpperCase()}`

            return (
              <article
                key={plan.id}
                className={`relative flex flex-col border bg-background p-6 sm:p-8 ${accent.tint} ${index > 0 ? "lg:-ml-px" : ""} ${plan.popular ? "z-10 border-2 border-primary shadow-lg shadow-primary/10" : "border-border"}`}
              >
                <div className={`absolute inset-x-0 top-0 flex h-1 items-center justify-between px-5 ${accent.strip}`} aria-hidden="true" />
                <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-4 pt-1">
                  <span className={`flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest ${accent.label}`}>
                    {PlanIcon ? <PlanIcon className="size-3.5" aria-hidden="true" /> : null}
                    {planLabel}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                </div>

                <div className="mt-6 flex min-h-8 items-center justify-between gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">{plan.name}</h3>
                  {isYearlyPaidPlan ? (
                    <span className="shrink-0 rounded border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-[10px] font-semibold text-primary">20% OFF</span>
                  ) : null}
                </div>
                <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{plan.description}</p>

                <div className="mt-6 flex min-h-12 items-baseline gap-2">
                  {isYearlyPaidPlan ? (
                    <span className="text-base text-destructive/70 line-through">${plan.monthly}</span>
                  ) : null}
                  <span className="text-4xl font-semibold tracking-tight">${displayPrice}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
                <p className="mt-1 min-h-4 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {plan.monthly === 0
                    ? "\u00a0"
                    : interval === "yearly"
                      ? <>${billedYearly} BILLED YEARLY · <span className={accent.label}>SAVE ${yearlySavings}</span></>
                      : "BILLED MONTHLY"}
                </p>

                <Button className="mt-6 w-full justify-between uppercase" type="button" disabled={isLoading} onClick={() => choosePlan(plan.id)}>
                  <span>{isLoading ? "Loading account..." : actionLabel}</span>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>

                <div className="mt-8 border-t border-border/70 pt-5">
                  <p className={`font-mono text-[10px] font-semibold uppercase tracking-widest ${accent.label}`}>WHAT YOU GET</p>
                  <ul className="mt-4 space-y-3 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[3px] border ${accent.check}`}>
                          <Check className="size-3" aria-hidden="true" />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-x border-b border-border px-4 py-4 sm:justify-between sm:px-6">
          {["CANCEL ANYTIME", "SECURE CHECKOUT VIA STRIPE", "NO HIDDEN FEES"].map((item) => (
            <span key={item} className="flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
              {item}
            </span>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">Plans, limits, and prices are draft examples. Confirm them against the live billing catalog before launch.</p>
      </div>
    </section>
  )
}