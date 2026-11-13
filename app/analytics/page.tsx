"use client"

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react"
import { AuthGate } from "@/components/AuthGate"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
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
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
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
  threadsConnectUrl,
  type Account,
} from "@/lib/api"
import type { AnalyticsMetric, AnalyticsOverview, AnalyticsPost } from "@/lib/api-types"
import { providerLabel } from "@/lib/social"

const ranges = [
  { days: 7 as const, label: "Last 7 days" },
  { days: 28 as const, label: "Last 28 days" },
  { days: 90 as const, label: "Last 90 days" },
]

const facebookMetrics: { key: AnalyticsMetric; label: string }[] = [
  { key: "views", label: "Views" },
  { key: "reach", label: "Reach" },
  { key: "engagements", label: "Engagements" },
  { key: "follows", label: "Follows" },
  { key: "unfollows", label: "Unfollows" },
  { key: "followers_total", label: "Followers" },
]

const threadsMetrics: { key: AnalyticsMetric; label: string }[] = [
  { key: "views", label: "Views" },
  { key: "likes", label: "Likes" },
  { key: "replies", label: "Replies" },
  { key: "reposts", label: "Reposts" },
  { key: "quotes", label: "Quotes" },
  { key: "followers_total", label: "Followers" },
]

function metricsFor(provider?: Account["provider"]) {
  return provider === "threads" ? threadsMetrics : facebookMetrics
}

function reconnectUrl(account: Account) {
  return account.provider === "threads"
    ? threadsConnectUrl()
    : facebookConnectUrl(account.id)
}

const growthChartConfig = {
  followers: { label: "Followers", color: "var(--chart-2)" },
  netChange: { label: "Net change", color: "var(--muted-foreground)" },
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

function chartDateLabel(value: string, points: AnalyticsChartPoint[]) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  const index = points.findIndex((point) => point.date === value)
  const previousDate = index > 0
    ? new Date(`${points[index - 1].date.slice(0, 10)}T00:00:00`)
    : null
  const monthChanged = previousDate === null || previousDate.getMonth() !== date.getMonth()
  return monthChanged || date.getDate() === 1
    ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : String(date.getDate())
}

function rangeDayCount(since: string, until: string) {
  const start = Date.parse(`${since.slice(0, 10)}T00:00:00Z`)
  const end = Date.parse(`${until.slice(0, 10)}T00:00:00Z`)
  return Number.isFinite(start) && Number.isFinite(end)
    ? Math.floor((end - start) / 86_400_000) + 1
    : null
}

function errorCode(error: unknown) {
  return error instanceof ApiError ? error.code : undefined
}

function LoadingSkeleton({ provider }: { provider?: Account["provider"] }) {
  return (
    <div role="status" aria-label="Loading analytics" className="space-y-5">
      <span className="sr-only">Loading analytics...</span>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metricsFor(provider).map((metric) => (
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
        const supportedAccounts = loadedAccounts.filter(
          (account) => account.provider === "facebook" || account.provider === "threads"
        )
        setAccounts(supportedAccounts)
        setAccountId((current) => supportedAccounts.some((account) => account.id === current)
          ? current
          : supportedAccounts[0]?.id ?? null)
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
  const accountMetrics = metricsFor(selectedAccount?.provider)
  const threadsMissingPermission = selectedAccount?.provider === "threads"
    && (errorCode(overviewError) === "missing_permission"
      || errorCode(postsError) === "missing_permission")
  const chartPoints = useMemo(() => overview ? buildAnalyticsChartPoints(overview) : [], [overview])
  const actualRangeDays = overview && typeof overview.range === "object"
    ? rangeDayCount(overview.range.since, overview.range.until)
    : null
  const limitedRange = selectedAccount?.provider === "facebook"
    && actualRangeDays !== null
    && actualRangeDays < days
    ? { actual: actualRangeDays, requested: days }
    : null
  const hasAnalytics = overview !== null && (
    accountMetrics.some(({ key }) => !isMetricUnavailable(overview, key)
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
          <p className="mt-1 text-sm text-muted-foreground">Performance and audience growth across your supported social accounts.</p>
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
                      <Badge variant="outline" className="text-[10px]">
                        {providerLabel(account.provider)}
                      </Badge>
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
          <p className="text-sm">Unable to load social accounts.</p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => {
            setAccountLoading(true)
            setAccountError(false)
            setRetryAccounts((count) => count + 1)
          }}>
            Retry
          </Button>
        </section>
      ) : accountLoading ? (
        <LoadingSkeleton provider={selectedAccount?.provider} />
      ) : accounts.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border p-8 text-center">
          <h2 className="font-medium">No supported accounts connected</h2>
          <p className="mt-1 text-sm text-muted-foreground">Connect a Facebook or Threads account to view analytics.</p>
          <a href="/accounts" className={buttonVariants({ className: "mt-4" })}>Manage accounts</a>
        </section>
      ) : selectedAccount ? (
        threadsMissingPermission ? (
          <section className="rounded-xl border border-dashed border-border p-8 text-center">
            <h2 className="font-medium">Threads analytics needs an extra permission</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Reconnect Threads to approve the permission needed to load analytics.
            </p>
            <Button
              type="button"
              className="mt-4"
              onClick={() => { window.location.href = threadsConnectUrl() }}
            >
              Reconnect Threads
            </Button>
          </section>
        ) : (
          <>
            {selectedAccount.status === "needs_reauth" ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-muted p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="border-primary/40 text-foreground">Needs reauth</Badge>
                  <span>Reconnect this account to restore analytics access.</span>
                </div>
                <a href={reconnectUrl(selectedAccount)} className={buttonVariants({ size: "sm", variant: "outline" })}>
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
              <LoadingSkeleton provider={selectedAccount.provider} />
            ) : overview ? (
              <>
                {!hasAnalytics && posts.length === 0 && !analyticsLoading ? (
                  <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    No analytics data is available for this account and date range yet.
                  </p>
                ) : null}

                <section aria-label="Performance metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {accountMetrics.map(({ key, label }) => (
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
                  <FollowerGrowthCard points={chartPoints} limitedRange={limitedRange} />
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
                          <th scope="col" className="pb-3 px-3 text-right font-medium">{selectedAccount.provider === "threads" ? "Likes" : "Reactions"}</th>
                          <th scope="col" className="pb-3 px-3 text-right font-medium">{selectedAccount.provider === "threads" ? "Replies" : "Comments"}</th>
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
                                className="line-clamp-2 font-medium hover:text-foreground"
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
        )
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
    ? `Recent post insights need an additional ${providerLabel(account.provider)} permission. Reconnect this account to approve it.`
    : code === "needs_reauth"
      ? `Recent posts require this ${providerLabel(account.provider)} account to be reconnected.`
      : code === "facebook_unavailable" || code === "threads_unavailable"
        ? overviewAvailable
          ? "Recent posts are temporarily unavailable. Your overview analytics loaded successfully."
          : `${providerLabel(account.provider)} could not load recent posts. Try again shortly.`
        : "Unable to load recent posts."

  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <span>{message}</span>
      <div className="flex gap-2">
        {needsReconnect ? (
          <a href={reconnectUrl(account)} className={buttonVariants({ size: "sm", variant: "outline" })}>
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
    ? `${providerLabel(account.provider)} requires a new permission to show analytics. Reconnect this account to approve the permission.`
    : code === "needs_reauth"
      ? `This ${providerLabel(account.provider)} account needs to be reconnected before analytics can load.`
      : code === "facebook_unavailable" || code === "threads_unavailable"
        ? `${providerLabel(account.provider)} analytics are temporarily unavailable. Try again shortly.`
        : "Unable to load analytics for this account."

  return (
    <section role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-destructive/25 bg-destructive/5 p-4">
      <p className="max-w-2xl text-sm">{message}</p>
      <div className="flex gap-2">
        {reconnect ? (
          <a href={reconnectUrl(account)} className={buttonVariants({ size: "sm", variant: "outline" })}>
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

function FollowerGrowthCard({
  points,
  limitedRange,
}: {
  points: AnalyticsChartPoint[]
  limitedRange: { actual: number; requested: number } | null
}) {
  const [zoomRange, setZoomRange] = useState<[string, string] | null>(null)
  const [dragRange, setDragRange] = useState<[string, string] | null>(null)
  const dragStartIndex = useRef<number | null>(null)
  const visiblePoints = zoomRange
    ? points.filter(({ date }) => date >= zoomRange[0] && date <= zoomRange[1])
    : points
  const { hasFollowerTotals, totalDomain, deltaDomain } = useMemo((): {
    hasFollowerTotals: boolean
    totalDomain: [number, number]
    deltaDomain: [number, number]
  } => {
    const totals = visiblePoints.flatMap(({ followers }) => followers === null ? [] : [followers])
    const bound = Math.max(1, ...visiblePoints.map((point) => Math.abs(point.netChange ?? 0)))
    const min = totals.length > 0 ? Math.min(...totals) : 0
    const max = totals.length > 0 ? Math.max(...totals) : 0
    const mid = (min + max) / 2
    const half = Math.max((max - min) / 2, bound)

    return {
      hasFollowerTotals: totals.length > 0,
      totalDomain: [Math.floor(mid - half), Math.ceil(mid + half)],
      deltaDomain: [-bound, bound],
    }
  }, [visiblePoints])
  const hasData = visiblePoints.some((point) => point.followers !== null || point.netChange !== null)
  const pointIndexFromPointer = (event: ReactMouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const plotStart = hasFollowerTotals ? 44 : 0
    const plotWidth = rect.width - plotStart - 40
    if (plotWidth <= 0 || visiblePoints.length === 0) return -1

    const position = Math.min(
      1,
      Math.max(0, (event.clientX - rect.left - plotStart) / plotWidth)
    )
    return Math.round(position * (visiblePoints.length - 1))
  }

  function startDrag(event: ReactMouseEvent<HTMLDivElement>) {
    if (visiblePoints.length < 2) return
    const index = pointIndexFromPointer(event)
    if (index < 0) return
    dragStartIndex.current = index
    setDragRange([visiblePoints[index].date, visiblePoints[index].date])
  }

  function moveDrag(event: ReactMouseEvent<HTMLDivElement>) {
    if (dragStartIndex.current === null) return
    const index = pointIndexFromPointer(event)
    if (index < 0) return
    const start = visiblePoints[dragStartIndex.current].date
    const end = visiblePoints[index].date
    setDragRange(start <= end ? [start, end] : [end, start])
  }

  function finishDrag(event: ReactMouseEvent<HTMLDivElement>) {
    const startIndex = dragStartIndex.current
    const endIndex = pointIndexFromPointer(event)
    if (startIndex !== null && endIndex >= 0 && Math.abs(endIndex - startIndex) >= 1) {
      setZoomRange([
        visiblePoints[Math.min(startIndex, endIndex)].date,
        visiblePoints[Math.max(startIndex, endIndex)].date,
      ])
    }
    dragStartIndex.current = null
    setDragRange(null)
  }

  return (
    <Card className="min-w-0 w-full border border-border shadow-none ring-0">
      <CardHeader>
        <CardTitle>Follower growth</CardTitle>
        {limitedRange ? (
          <CardDescription className="text-muted-foreground">
            Facebook returned {limitedRange.actual} days of data for the selected {limitedRange.requested}-day range.
          </CardDescription>
        ) : null}
        {zoomRange ? (
          <CardAction>
            <Button type="button" variant="outline" size="sm" onClick={() => setZoomRange(null)}>
              Reset zoom
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="min-w-0">
        {hasData ? (
          <>
            <ChartContainer
              config={growthChartConfig}
              className="aspect-auto h-[280px] w-full min-w-0 sm:h-[400px]"
              onMouseDown={startDrag}
              onMouseMove={moveDrag}
              onMouseUp={finishDrag}
              onMouseLeave={(event) => {
                if (dragStartIndex.current !== null) finishDrag(event)
              }}
            >
              <ComposedChart
                data={visiblePoints}
                margin={{ left: 0, right: 0, top: 12, bottom: 4 }}
                onDoubleClick={() => {
                  setZoomRange(null)
                  setDragRange(null)
                }}
              >
                <CartesianGrid
                  horizontal
                  vertical
                  stroke="var(--border)"
                  strokeOpacity={0.45}
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={18}
                  interval="preserveStartEnd"
                  tickFormatter={(value) => chartDateLabel(String(value), visiblePoints)}
                />
                {hasFollowerTotals ? (
                  <YAxis
                    yAxisId="total"
                    domain={totalDomain}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    allowDecimals={false}
                  />
                ) : null}
                <YAxis
                  yAxisId="delta"
                  orientation="right"
                  domain={deltaDomain}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  allowDecimals={false}
                />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    const point = payload?.[0]?.payload as AnalyticsChartPoint | undefined
                    if (!active || !point) return null

                    return (
                      <div className="grid min-w-36 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                        <div className="font-medium">{displayDate(String(label))}</div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Net change</span>
                          <span className={`font-mono font-medium tabular-nums ${point.netChange === null
                            ? "text-muted-foreground"
                            : point.netChange > 0
                              ? "text-green-500"
                              : point.netChange < 0
                                ? "text-red-500"
                                : "text-muted-foreground"}`}>
                            {point.netChange === null
                              ? "n/a"
                              : `${point.netChange > 0 ? "+" : ""}${point.netChange}`}
                          </span>
                        </div>
                        {point.followers !== null ? (
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Followers</span>
                            <span className="font-mono font-medium tabular-nums">{point.followers}</span>
                          </div>
                        ) : null}
                      </div>
                    )
                  }}
                />
                <ReferenceLine y={0} yAxisId="delta" stroke="var(--border)" />
                <Bar
                  yAxisId="delta"
                  dataKey="netChange"
                  barSize={12}
                  radius={[3, 3, 3, 3]}
                  isAnimationActive={false}
                >
                  {visiblePoints.map((point) => (
                    <Cell
                      key={point.date}
                      fill={point.netChange === null
                        ? "transparent"
                        : point.netChange > 0
                          ? "#22c55e"
                          : point.netChange < 0
                            ? "#ef4444"
                            : "transparent"}
                    />
                  ))}
                </Bar>
                {hasFollowerTotals ? (
                  <Line
                    yAxisId="total"
                    type="stepAfter"
                    dataKey="followers"
                    stroke="var(--color-followers)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                ) : null}
                {dragRange && dragRange[0] !== dragRange[1] ? (
                  <ReferenceArea
                    x1={dragRange[0]}
                    x2={dragRange[1]}
                    fill="var(--primary)"
                    fillOpacity={0.16}
                    stroke="var(--primary)"
                    strokeOpacity={0.35}
                  />
                ) : null}
              </ComposedChart>
            </ChartContainer>
            <div className="mt-2 hidden justify-end text-xs text-muted-foreground sm:flex">
              You can drag the chart to zoom.
            </div>
          </>
        ) : (
          <ChartEmptyState message="No follower data available for this range." />
        )}
      </CardContent>
    </Card>
  )
}
