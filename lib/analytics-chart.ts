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
  const seriesKeys: AnalyticsMetric[] = ["follows", "unfollows", "followers_total"]
  const series = new Map(seriesKeys.map((key) => [key, metricSeries(overview, key)]))
  const dates = new Set(seriesKeys.flatMap((key) => series.get(key)?.map(({ date }) => date) ?? []))
  const valuesByKey = new Map(seriesKeys.map((key) => [
    key,
    new Map(series.get(key)?.map(({ date, value }) => [date, value]) ?? []),
  ]))
  const canCalculateGrowth = !isUnavailable(overview, "follows")
    && !isUnavailable(overview, "unfollows")
  const follows = valuesByKey.get("follows")!
  const unfollows = valuesByKey.get("unfollows")!
  const totals = valuesByKey.get("followers_total")!
  const points = [...dates].sort().map((date) => {
    const followed = follows.get(date)
    const unfollowed = unfollows.get(date)
    return {
      date,
      netChange: canCalculateGrowth && numericValue(followed) && numericValue(unfollowed)
        ? followed - unfollowed
        : null,
      followers: numericValue(totals.get(date)) ? totals.get(date)! : null,
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
