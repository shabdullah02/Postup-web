import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"

const queueItems = [
  { time: "Today · 9:00 AM", caption: "A first look at what we’ve been making", status: "Scheduled" },
  { time: "Tomorrow · 11:30 AM", caption: "Three small ideas for a brighter week", status: "Scheduled" },
  { time: "Friday · 2:00 PM", caption: "A note for the community", status: "Draft" },
]

const benefits = ["Draft ahead", "Schedule posts", "Track Page analytics"]

function AnalyticsPreview() {
  return (
    <div aria-hidden="true" className="min-w-0">
      <div className="border border-border bg-card">
        <div className="flex h-10 items-center justify-between gap-3 border-b border-border px-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="size-2 border border-border bg-muted" />
            <span className="size-2 border border-border bg-muted" />
            <span className="size-2 border border-border bg-primary" />
            <span className="ml-2 truncate text-xs text-muted-foreground">postup.app / analytics</span>
          </div>
          <span className="shrink-0 text-[9px] text-muted-foreground">Sample data</span>
        </div>

        <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
          {[
            { label: "Followers", value: "2,184" },
            { label: "Reach", value: "6,420" },
            { label: "Views", value: "8,306" },
          ].map((metric) => (
            <div key={metric.label} className="min-w-0 px-3 py-3 sm:px-4">
              <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{metric.label}</p>
              <p className="mt-1 text-base font-semibold leading-none text-foreground sm:text-lg">{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 p-3 sm:p-4 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="min-w-0">
            <h2 className="text-xs font-semibold text-foreground">Follower growth</h2>
            <svg
              viewBox="0 0 320 112"
              className="mt-2 block h-24 w-full"
              role="presentation"
              focusable="false"
            >
              <path d="M8 20H312M8 54H312M8 88H312" className="stroke-border" strokeWidth="1" />
              <rect x="44" y="58" width="3" height="30" className="fill-emerald-600 dark:fill-emerald-400" />
              <rect x="91" y="42" width="3" height="46" className="fill-emerald-600 dark:fill-emerald-400" />
              <rect x="138" y="49" width="3" height="39" className="fill-red-600 dark:fill-red-400" />
              <rect x="185" y="32" width="3" height="56" className="fill-emerald-600 dark:fill-emerald-400" />
              <rect x="232" y="38" width="3" height="50" className="fill-emerald-600 dark:fill-emerald-400" />
              <rect x="279" y="24" width="3" height="64" className="fill-emerald-600 dark:fill-emerald-400" />
              <path
                d="M8 78C28 73 32 68 47 67S78 58 94 56 126 60 141 55 171 43 188 42 218 45 235 39 265 31 282 30 302 24 312 22"
                className="fill-none stroke-indigo-600 dark:stroke-indigo-400"
                strokeWidth="1.5"
                strokeLinecap="square"
              />
            </svg>
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </section>

          <section className="min-w-0">
            <h2 className="border-b border-border pb-2 text-xs font-semibold text-foreground">Queue</h2>
            <ul className="divide-y divide-border">
              {queueItems.map((item) => (
                <li key={item.time} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2 py-2">
                  <span className="col-span-2 text-[9px] text-muted-foreground sm:text-[10px]">{item.time}</span>
                  <span className="truncate text-[10px] leading-5 text-foreground sm:text-xs">{item.caption}</span>
                  <span className="justify-self-end border border-border px-1.5 py-0.5 text-[9px] leading-4 text-muted-foreground">
                    {item.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

export default function Hero() {
  return (
    <section aria-labelledby="landing-hero-title" className="border-b border-border">
      <div className="mx-auto grid max-w-7xl items-center gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-0 lg:p-10">
        <div className="min-w-0">
          <p className="mb-5 inline-flex border border-border px-3 py-1.5 text-xs font-medium text-foreground">
            Facebook Page scheduling
          </p>
          <h1
            id="landing-hero-title"
            className="max-w-full text-[clamp(1.7rem,3.1vw,2.625rem)] font-semibold leading-[1.02] tracking-[-0.055em] text-foreground"
          >
            <span className="block whitespace-nowrap">Schedule Facebook posts.</span>
            <span className="block whitespace-nowrap">Know what works.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
            Draft ahead, keep your publishing queue full, and see follower and reach analytics for every connected Page, in one calm workspace.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex min-h-11 items-center gap-2 border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Start for free
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="#features"
              className="inline-flex min-h-11 items-center gap-2 border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              See how it works
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground sm:text-sm">
            {benefits.map((benefit) => (
              <li key={benefit} className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" aria-hidden="true" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 lg:translate-y-12">
          <AnalyticsPreview />
        </div>
      </div>
    </section>
  )
}
