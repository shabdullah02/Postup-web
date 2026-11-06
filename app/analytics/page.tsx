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
  type ChartConfig,
} from "@/components/ui/chart"
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"
import { buildAnalyticsChartPoints, type AnalyticsChartPoint } from "@/lib/analytics-chart"
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
  followers: { label: "Followers", color: "var(--primary)" },
} satisfies ChartConfig

function isMetricUnavailable(overview: AnalyticsOverview, key: AnalyticsMetric) {
  return overview.unavailable.some((item) => typeof item === "string"
    ? item === key
    : item.key === key)
}

function metricValue(overview: AnalyticsOverview, key: AnalyticsMetric) {
  if (isMetricUnavailable(overview, key)) return "n/a"
  const value = overview.totals?.[key]
  return value === null || value === undefined || !Number.isFinite(value)
    ? "n/a"
    : new Intl.NumberFormat().format(value)
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
      <div className="h-80 animate-pulse rounded-2xl bg-muted" />
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
  const chartPoints = useMemo(() => overview ? buildAnalyticsChartPoints(overview) : [], [overview])
  const followerTotals = chartPoints.flatMap((point) => point.followers === null ? [] : [point.followers])
  const hasFollowerHistory = followerTotals.length > 1
  const minFollowerTotal = Math.min(0, ...followerTotals)
  const maxFollowerTotal = Math.max(0, ...followerTotals)
  const followerDomain: [number, number] = [
    minFollowerTotal,
    maxFollowerTotal + 1,
  ]
  const followerTicks = Array.from(
    { length: Math.floor(followerDomain[1]) - Math.ceil(followerDomain[0]) + 1 },
    (_, index) => Math.ceil(followerDomain[0]) + index
  )
  const hasAnalytics = overview !== null && (
    metrics.some(({ key }) => !isMetricUnavailable(overview, key)
      && overview.totals?.[key] !== null
      && overview.totals?.[key] !== undefined)
    || chartPoints.some((point) => point.netChange !== null || point.followers !== null)
  )

  function retry() {
    setRetryAnalytics((count) => count + 1)
  }

  return (
    <main className="min-h-[70vh] min-w-0 space-y-6 p-3 sm:p-8">
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

          {overviewError ? (
            <AnalyticsError
              code={errorCode(overviewError)}
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

              <section className="grid min-w-0 gap-5">
                <Card className="min-w-0 w-full">
                  <CardHeader>
                    <CardTitle>Follower growth</CardTitle>
                    <CardDescription>Total followers over time.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {hasFollowerHistory ? (
                      <ChartContainer config={growthChartConfig} className="aspect-auto h-80 w-full min-w-0">
                        <LineChart data={chartPoints} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={displayDate} />
                          <YAxis
                            domain={followerDomain}
                            ticks={followerTicks}
                            tickLine={false}
                            axisLine={false}
                            width={38}
                            allowDecimals={false}
                          />
                          <ChartTooltip
                            content={({ active, payload, label }) => {
                              const point = payload?.[0]?.payload as AnalyticsChartPoint | undefined
                              if (!active || !point) return null
                              const netChange = point.netChange

                              return (
                                <div className="grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                  <div className="font-medium">{displayDate(String(label))}</div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Total followers</span>
                                    <span className="font-mono font-medium tabular-nums">{point.followers}</span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Net change</span>
                                    <span className="font-mono font-medium tabular-nums">
                                      {netChange === null
                                        ? "n/a"
                                        : `${netChange > 0 ? "+" : ""}${netChange}`}
                                    </span>
                                  </div>
                                </div>
                              )
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="followers"
                            stroke="var(--color-followers)"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                            connectNulls={false}
                          />
                        </LineChart>
                      </ChartContainer>
                    ) : (
                      <ChartEmptyState message="No follower total history for this range." />
                    )}
                    {!hasFollowerHistory ? (
                      <p className="mt-3 text-xs text-muted-foreground">Follower total history unavailable.</p>
                    ) : null}
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
                <PostsError
                  code={errorCode(postsError)}
                  account={selectedAccount}
                  overviewAvailable={overview !== null}
                  retry={retry}
                />
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

function PostsError({
  code,
  account,
  overviewAvailable,
  retry,
}: {
  code?: string
  account: Account
  overviewAvailable: boolean
  retry: () => void
}) {
  const needsReconnect = code === "missing_permission" || code === "needs_reauth"
  const message = code === "missing_permission"
    ? "Recent post insights need an additional Facebook permission. Reconnect this account to approve it."
    : code === "needs_reauth"
      ? "Recent posts require this Facebook account to be reconnected."
      : code === "facebook_unavailable"
        ? overviewAvailable
          ? "Recent posts are temporarily unavailable. Your overview analytics loaded successfully."
          : "Facebook could not load recent posts. Try again shortly."
        : "Unable to load recent posts."

  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <span>{message}</span>
      <div className="flex gap-2">
        {needsReconnect ? (
          <a href={facebookConnectUrl(account.id)} className={buttonVariants({ size: "sm", variant: "outline" })}>
            Reconnect
          </a>
        ) : null}
        <Button type="button" size="sm" variant="outline" onClick={retry}>Retry</Button>
      </div>
    </div>
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

function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}
