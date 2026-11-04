"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdminToast } from "@/components/admin/AdminShell"
import { getAdminStats, type AdminStats } from "@/lib/api"

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { notify } = useAdminToast()

  useEffect(() => {
    let isMounted = true
    getAdminStats()
      .then((data) => {
        if (isMounted) setStats(data)
      })
      .catch((error: unknown) => {
        if (isMounted) notify("error", error instanceof Error ? error.message : "Unable to load admin statistics.")
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [notify])

  const statsEntries = stats ? Object.entries(stats) : []

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-2 text-muted-foreground">A snapshot of Postup accounts and subscriptions.</p>
      </header>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading statistics">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl border border-border bg-muted/50" />)}
        </div>
      ) : statsEntries.length === 0 ? (
        <p className="rounded-lg border border-border p-5 text-sm text-muted-foreground">No statistics are available.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statsEntries.map(([key, value]) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium capitalize text-muted-foreground">
                  {key.replaceAll("_", " ")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {typeof value === "object" && value !== null ? (
                  Object.keys(value).length === 0 ? (
                    <p className="text-sm text-muted-foreground">None</p>
                  ) : (
                    <ul className="space-y-1">
                      {Object.entries(value).map(([name, count]) => (
                        <li key={name} className="flex justify-between text-sm">
                          <span className="capitalize">{name.replaceAll("_", " ")}</span>
                          <span className="font-semibold">{String(count)}</span>
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  <p className="text-3xl font-semibold">{String(value ?? 0)}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}