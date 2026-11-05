"use client"

import { useEffect, useMemo, useState } from "react"
import { AuthGate } from "@/components/AuthGate"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  ApiError,
  facebookConnectUrl,
  getAnalyticsOverview,
  listAnalyticsAccounts,
  listAnalyticsPosts,
  type Account,
} from "@/lib/api"
import type { AnalyticsMetric, AnalyticsOverview, AnalyticsPost } from "@/lib/api-types"

const ranges = [
  { days: 7 as const, label: "Last 7 days" },
  { days: 28 as const, label: "Last 28 days" },
  { days: 90 as const, label: "Last 90 days" },
]

const metrics: { key: AnalyticsMetric; label: string }[] = [
  { key: "views", label: "Views" },
  { key: "reach", label: "Reach" },
  { key: "engagements", label: "Engagements" },
  { key: "follows", label: "Follows" },
  { key: "unfollows", label: "Unfollows" },
  { key: "followers_total", label: "Followers" },
]

const growthChartConfig = {
  netChange: { label: "Net change", color: "var(--chart-2)" },
  followers: { label: "Followers", color: "var(--primary)" },
} satisfies ChartConfig

const viewsChartConfig = {
  views: { label: "Views", color: "var(--primary)" },
} satisfies ChartConfig

type ChartPoint = {
  date: string
  netChange: number | null
  followers: number | null
  views: number | null
}

function isMetricUnavailable(overview: AnalyticsOverview, key: AnalyticsMetric) {
  return overview.unavailable?.includes(key) ?? false
}

function metricValue(overview: AnalyticsOverview, key: AnalyticsMetric) {
  if (isMetricUnavailable(overview, key)) return "n/a"
  const value = overview.totals?.[key]
  return value === null || value === undefined || !Number.isFinite(value)
    ? "n/a"
    : new Intl.NumberFormat().format(value)
}

function makeChartPoints(overview: AnalyticsOverview): ChartPoint[] {
  const dates = new Set<string>()
  for (const key of ["follows", "unfollows", "followers_total", "views"] as const) {
    for (const point of overview.series?.[key] ?? []) dates.add(point.date)
  }

  const valuesByKey = (key: AnalyticsMetric) => new Map(
    (overview.series?.[key] ?? []).map(({ date, value }) => [date, value])
  )
  const follows = valuesByKey("follows")
  const unfollows = valuesByKey("unfollows")
  const followers = valuesByKey("followers_total")
  const views = valuesByKey("views")
  const canCalculateGrowth = !isMetricUnavailable(overview, "follows")
    && !isMetricUnavailable(overview, "unfollows")
  const hasFollowers = !isMetricUnavailable(overview, "followers_total")

  return [...dates].sort().map((date) => {
    const followed = follows.get(date)
    const unfollowed = unfollows.get(date)
    return {
      date,
      netChange: canCalculateGrowth && followed != null && unfollowed != null
        ? followed - unfollowed
        : null,
      followers: hasFollowers ? followers.get(date) ?? null : null,
      views: isMetricUnavailable(overview, "views") ? null : views.get(date) ?? null,
    }
  })
}

function displayDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function errorCode(error: unknown) {
  return error instanceof ApiError ? error.code : undefined
}

function LoadingSkeleton() {
  return (
    <div role="status" aria-label="Loading analytics" className="space-y-5">
      <span className="sr-only">Loading analytics...</span>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.key} className="h-28 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="h-80 animate-pulse rounded-2xl bg-muted" />
        <div className="h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-muted" />
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <AuthGate>
      <AnalyticsContent />
    </AuthGate>
  )
}

function AnalyticsContent() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState<number | null>(null)
  const [days, setDays] = useState<7 | 28 | 90>(7)
  const [accountLoading, setAccountLoading] = useState(true)
  const [accountError, setAccountError] = useState(false)
  const [analyticsResult, setAnalyticsResult] = useState<{
    key: string
    overview?: AnalyticsOverview
    posts?: AnalyticsPost[]
    overviewError?: unknown
    postsError?: unknown
  } | null>(null)
  const [retryAccounts, setRetryAccounts] = useState(0)
  const [retryAnalytics, setRetryAnalytics] = useState(0)
  const requestKey = `${accountId ?? "none"}:${days}:${retryAnalytics}`
  const resultIsCurrent = analyticsResult?.key === requestKey
  const overview = resultIsCurrent ? analyticsResult?.overview ?? null : null
  const posts = resultIsCurrent ? analyticsResult?.posts ?? [] : []
  const overviewError = resultIsCurrent ? analyticsResult?.overviewError ?? null : null
  const postsError = resultIsCurrent ? analyticsResult?.postsError ?? null : null
  const analyticsLoading = accountId !== null && !resultIsCurrent

  useEffect(() => {
    let active = true
    listAnalyticsAccounts()
      .then((loadedAccounts) => {
        if (!active) return
        const facebookAccounts = loadedAccounts.filter((account) => account.provider === "facebook")
        setAccounts(facebookAccounts)
        setAccountId((current) => facebookAccounts.some((account) => account.id === current)
          ? current
          : facebookAccounts[0]?.id ?? null)
      })
      .catch(() => {
        if (active) setAccountError(true)
      })
      .finally(() => {
        if (active) setAccountLoading(false)
      })

    return () => {
      active = false
    }
  }, [retryAccounts])

  useEffect(() => {
    if (accountId === null) return

    let active = true

    Promise.allSettled([
      getAnalyticsOverview(accountId, days),
      listAnalyticsPosts(accountId),
    ]).then(([overviewResult, postsResult]) => {
      if (!active) return
      setAnalyticsResult({
        key: requestKey,
        ...(overviewResult.status === "fulfilled"
          ? { overview: overviewResult.value }
          : { overviewError: overviewResult.reason }),
        ...(postsResult.status === "fulfilled"
          ? { posts: postsResult.value }
          : { postsError: postsResult.reason }),
      })
    })

    return () => {
      active = false
    }
  }, [accountId, days, requestKey])

  const selectedAccount = accounts.find((account) => account.id === accountId) ?? null
  const chartPoints = useMemo(() => overview ? makeChartPoints(overview) : [], [overview])
  const hasAnalytics = overview !== null && (
    metrics.some(({ key }) => !isMetricUnavailable(overview, key)
      && overview.totals?.[key] !== null
      && overview.totals?.[key] !== undefined)
    || chartPoints.some((point) => point.netChange !== null || point.followers !== null || point.views !== null)
  )
  const currentError = overviewError ?? postsError
  const currentErrorCode = errorCode(overviewError) ?? errorCode(postsError)

  function retry() {
    setRetryAnalytics((count) => count + 1)
  }

  return (
    <main className="min-h-[70vh] space-y-6 p-5 sm:p-8">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Performance and audience growth for your Facebook pages.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="min-w-52 space-y-1.5">
            <label htmlFor="analytics-account" className="text-xs font-medium text-muted-foreground">Account</label>
            <Select
              value={accountId === null ? "" : String(accountId)}
              onValueChange={(value) => setAccountId(value ? Number(value) : null)}
              disabled={accountLoading || accounts.length === 0}
            >
              <SelectTrigger id="analytics-account" className="w-full">
                <SelectValue placeholder={accountLoading ? "Loading accounts..." : "Select an account"} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    <span className="flex items-center gap-2">
                      {account.name}
                      {account.status === "needs_reauth" ? (
                        <Badge variant="outline" className="text-[10px]">Needs reauth</Badge>
                      ) : null}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-40 space-y-1.5">
            <label htmlFor="analytics-range" className="text-xs font-medium text-muted-foreground">Date range</label>
            <Select value={String(days)} onValueChange={(value) => {
              if (value === "7" || value === "28" || value === "90") setDays(Number(value) as 7 | 28 | 90)
            }}>
              <SelectTrigger id="analytics-range" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ranges.map((range) => (
                  <SelectItem key={range.days} value={String(range.days)}>{range.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {accountError ? (
        <section role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <p className="text-sm">Unable to load Facebook accounts.</p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => {
            setAccountLoading(true)
            setAccountError(false)
            setRetryAccounts((count) => count + 1)
          }}>
            Retry
          </Button>
        </section>
      ) : accountLoading ? (
        <LoadingSkeleton />
      ) : accounts.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border p-8 text-center">
          <h2 className="font-medium">No Facebook accounts connected</h2>
          <p className="mt-1 text-sm text-muted-foreground">Connect a Facebook page to view its analytics.</p>
          <a href="/accounts" className={buttonVariants({ className: "mt-4" })}>Manage accounts</a>
        </section>
      ) : selectedAccount ? (
        <>
          {selectedAccount.status === "needs_reauth" ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="border-amber-600/40 text-amber-700 dark:text-amber-400">Needs reauth</Badge>
                <span>Reconnect this account to restore analytics access.</span>
              </div>
              <a href={facebookConnectUrl(selectedAccount.id)} className={buttonVariants({ size: "sm", variant: "outline" })}>
                Reconnect
              </a>
            </div>
          ) : null}

          {currentError ? (
            <AnalyticsError
              code={currentErrorCode}
              account={selectedAccount}
              retry={retry}
            />
          ) : null}

          {analyticsLoading ? (
            <LoadingSkeleton />
          ) : overview ? (
            <>
              {!hasAnalytics && posts.length === 0 && !analyticsLoading ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  No analytics data is available for this account and date range yet.
                </p>
              ) : null}

              <section aria-label="Performance metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {metrics.map(({ key, label }) => (
                  <Card key={key} size="sm">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="mt-2 text-2xl font-semibold tabular-nums">
                        {metricValue(overview, key)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </section>

              <section className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <Card>
                  <CardHeader>
                    <CardTitle>Follower growth</CardTitle>
                    <CardDescription>Daily net change and total followers, when available.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {chartPoints.some((point) => point.netChange !== null || point.followers !== null) ? (
                      <ChartContainer config={growthChartConfig} className="aspect-auto h-64 w-full">
                        <ComposedChart data={chartPoints} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={displayDate} />
                          <YAxis yAxisId="growth" tickLine={false} axisLine={false} width={34} />
                          <YAxis yAxisId="total" orientation="right" tickLine={false} axisLine={false} width={38} />
                          <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => displayDate(String(value))} />} />
                          <Bar yAxisId="growth" dataKey="netChange" radius={[4, 4, 0, 0]}>
                            {chartPoints.map((point) => (
                              <Cell
                                key={point.date}
                                fill={point.netChange === null
                                  ? "var(--chart-3)"
                                  : point.netChange >= 0
                                    ? "#16834f"
                                    : "#b42318"}
                              />
                            ))}
                          </Bar>
                          {chartPoints.some((point) => point.followers !== null) ? (
                            <Line
                              yAxisId="total"
                              type="monotone"
                              dataKey="followers"
                              stroke="var(--color-followers)"
                              strokeWidth={2}
                              dot={false}
                              connectNulls={false}
                            />
                          ) : null}
                        </ComposedChart>
                      </ChartContainer>
                    ) : (
                      <ChartEmptyState />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Views over time</CardTitle>
                    <CardDescription>Daily page views for the selected range.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {chartPoints.some((point) => point.views !== null) ? (
                      <ChartContainer config={viewsChartConfig} className="aspect-auto h-64 w-full">
                        <LineChart data={chartPoints} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={displayDate} />
                          <YAxis tickLine={false} axisLine={false} width={34} />
                          <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => displayDate(String(value))} />} />
                          <Line
                            type="monotone"
                            dataKey="views"
                            stroke="var(--color-views)"
                            strokeWidth={2}
                            dot={false}
                            connectNulls={false}
                          />
                        </LineChart>
                      </ChartContainer>
                    ) : (
                      <ChartEmptyState />
                    )}
                  </CardContent>
                </Card>
              </section>
            </>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Recent posts</CardTitle>
              <CardDescription>Engagement for posts published by this account.</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div role="status" className="h-36 animate-pulse rounded-xl bg-muted" />
              ) : postsError ? (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span>Unable to load recent posts.</span>
                  <Button type="button" size="sm" variant="outline" onClick={retry}>Retry</Button>
                </div>
              ) : posts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No recent posts found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[42rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th scope="col" className="pb-3 pr-4 font-medium">Post</th>
                        <th scope="col" className="pb-3 px-3 font-medium">Date</th>
                        <th scope="col" className="pb-3 px-3 text-right font-medium">Reactions</th>
                        <th scope="col" className="pb-3 px-3 text-right font-medium">Comments</th>
                        <th scope="col" className="pb-3 pl-3 text-right font-medium">Shares</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((post) => (
                        <tr key={post.id} className="border-b border-border/70 last:border-0">
                          <td className="max-w-80 py-3 pr-4">
                            <a
                              href={post.permalink_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="line-clamp-2 font-medium hover:text-primary"
                            >
                              {post.message || "View post"}
                            </a>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                            {post.created_time ? new Date(post.created_time).toLocaleDateString() : "n/a"}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">{post.reactions ?? "n/a"}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{post.comments ?? "n/a"}</td>
                          <td className="pl-3 py-3 text-right tabular-nums">{post.shares ?? "n/a"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </main>
  )
}

function AnalyticsError({
  code,
  account,
  retry,
}: {
  code?: string
  account: Account
  retry: () => void
}) {
  const reconnect = code === "missing_permission" || code === "needs_reauth"
  const message = code === "missing_permission"
    ? "Facebook requires a new permission to show analytics. Reconnect this account to approve the permission."
    : code === "needs_reauth"
      ? "This Facebook account needs to be reconnected before analytics can load."
      : code === "facebook_unavailable"
        ? "Facebook analytics are temporarily unavailable. Try again shortly."
        : "Unable to load analytics for this account."

  return (
    <section role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-destructive/25 bg-destructive/5 p-4">
      <p className="max-w-2xl text-sm">{message}</p>
      <div className="flex gap-2">
        {reconnect ? (
          <a href={facebookConnectUrl(account.id)} className={buttonVariants({ size: "sm", variant: "outline" })}>
            Reconnect
          </a>
        ) : null}
        <Button type="button" size="sm" variant="outline" onClick={retry}>Retry</Button>
      </div>
    </section>
  )
}

function ChartEmptyState() {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
      No data available for this range.
    </div>
  )
}
