import type { AnalyticsMetric, AnalyticsOverview } from "./api-types"

export type AnalyticsChartPoint = {
  date: string
  netChange: number | null
  followers: number | null
}

function isUnavailable(overview: AnalyticsOverview, key: AnalyticsMetric): boolean {
  return overview.unavailable.some((item) => typeof item === "string"
    ? item === key
    : item.key === key)
}

function metricSeries(overview: AnalyticsOverview, key: AnalyticsMetric) {
  return isUnavailable(overview, key) ? [] : overview.series[key] ?? []
}

function numericValue(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value)
}

export function buildAnalyticsChartPoints(overview: AnalyticsOverview): AnalyticsChartPoint[] {
  const series = {
    follows: metricSeries(overview, "follows"),
    unfollows: metricSeries(overview, "unfollows"),
    followers_total: metricSeries(overview, "followers_total"),
    net_follower_growth: overview.series.net_follower_growth ?? [],
  }
  const dates = new Set(Object.values(series).flatMap((items) => items?.map(({ date }) => date) ?? []))
  const toMap = (items: typeof series.follows) => new Map(
    items?.map(({ date, value }) => [date, value] as const) ?? []
  )
  const valuesByKey = {
    follows: toMap(series.follows),
    unfollows: toMap(series.unfollows),
    followers_total: toMap(series.followers_total),
    net_follower_growth: toMap(series.net_follower_growth),
  }
  const canCalculateGrowth = !isUnavailable(overview, "follows")
    && !isUnavailable(overview, "unfollows")
  const follows = valuesByKey.follows
  const unfollows = valuesByKey.unfollows
  const totals = valuesByKey.followers_total
  const backendGrowth = valuesByKey.net_follower_growth
  const points = [...dates].sort().map((date) => {
    const followed = follows.get(date)
    const unfollowed = unfollows.get(date)
    const previousDate = new Date(`${date}T00:00:00Z`)
    previousDate.setUTCDate(previousDate.getUTCDate() - 1)
    const previousTotal = totals.get(previousDate.toISOString().slice(0, 10))
    const total = totals.get(date)
    const dailyGrowth = backendGrowth.get(date)
    const netChange = numericValue(dailyGrowth)
      ? dailyGrowth
      : canCalculateGrowth
        ? numericValue(followed) && numericValue(unfollowed)
          ? followed - unfollowed
          : null
        : numericValue(total) && numericValue(previousTotal)
          ? total - previousTotal
          : null

    return {
      date,
      netChange,
      followers: numericValue(total) ? total : null,
    }
  })

  const datedTotals = points.filter((point) => point.followers !== null)
  const distinctApiTotals = new Set(datedTotals.map((point) => point.followers))
  const hasHistoricalApiTotals = datedTotals.length >= 2 && distinctApiTotals.size >= 2
  if (hasHistoricalApiTotals) return points

  const currentTotal = overview.totals.followers_total
  const hasCompleteNetChanges = points.length >= 2
    && numericValue(currentTotal)
    && points.every((point) => point.netChange !== null)

  if (!hasCompleteNetChanges) {
    return points.map((point) => ({ ...point, followers: null }))
  }

  const reconstructed = new Array<number>(points.length)
  reconstructed[points.length - 1] = currentTotal
  for (let index = points.length - 1; index > 0; index -= 1) {
    reconstructed[index - 1] = reconstructed[index] - points[index].netChange!
  }

  if (new Set(reconstructed).size < 2) {
    return points.map((point) => ({ ...point, followers: null }))
  }

  return points.map((point, index) => ({ ...point, followers: reconstructed[index] }))
}
