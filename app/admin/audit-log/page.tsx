"use client"

import { useEffect, useState } from "react"
import { AdminShell } from "@/components/admin/AdminShell"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getAuditLog } from "@/lib/api"
import type { AuditLogEntry } from "@/lib/api-types"

function dateLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString()
}

export default function AdminAuditLogPage() {
  return (
    <AdminShell>
      <AuditLogContent />
    </AdminShell>
  )
}

function AuditLogContent() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [action, setAction] = useState("")
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isActive = true
    setIsLoading(true)
    setError("")
    getAuditLog({ page, action: action.trim() || undefined })
      .then((result) => {
        if (!isActive) return
        setEntries(result.results)
        setCount(result.count)
        setHasNext(Boolean(result.next))
        setHasPrevious(Boolean(result.previous))
      })
      .catch((requestError: unknown) => {
        if (!isActive) return
        setError(requestError instanceof Error ? requestError.message : "Unable to load the audit log.")
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })
    return () => {
      isActive = false
    }
  }, [action, page, reloadKey])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-2 text-muted-foreground">Review administrative and account events.</p>
      </header>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full max-w-sm space-y-2">
          <label htmlFor="audit-action-filter" className="text-sm font-medium">Filter by action</label>
          <Input id="audit-action-filter" value={action} onChange={(event) => { setAction(event.target.value); setPage(1) }} placeholder="Action name" />
        </div>
        <p className="text-sm text-muted-foreground">{count.toLocaleString()} events</p>
      </div>

      {isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading audit events...</p> : null}
      {error ? (
        <div className="space-y-3 rounded-md border border-destructive/30 p-4">
          <p role="alert" className="text-sm text-destructive">{error}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => setReloadKey((key) => key + 1)}>Retry</Button>
        </div>
      ) : null}
      {!isLoading && !error && entries.length === 0 ? <p className="rounded-md border p-6 text-sm text-muted-foreground">No audit events match this filter.</p> : null}
      {!isLoading && !error && entries.length > 0 ? (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Time</th>
                <th scope="col" className="px-4 py-3 font-medium">Who</th>
                <th scope="col" className="px-4 py-3 font-medium">Target</th>
                <th scope="col" className="px-4 py-3 font-medium">Action</th>
                <th scope="col" className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map((entry) => <AuditRow key={entry.id} entry={entry} />)}
            </tbody>
          </table>
        </Card>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <Button type="button" variant="outline" disabled={!hasPrevious || isLoading} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
        <span className="text-sm text-muted-foreground">Page {page}</span>
        <Button type="button" variant="outline" disabled={!hasNext || isLoading} onClick={() => setPage((current) => current + 1)}>Next</Button>
      </div>
    </div>
  )
}

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const detailText = JSON.stringify(entry.details)
  return (
    <tr>
      <td className="whitespace-nowrap px-4 py-3">{dateLabel(entry.timestamp)}</td>
      <td className="px-4 py-3">{entry.who_identifier}</td>
      <td className="px-4 py-3">{entry.target_identifier}</td>
      <td className="px-4 py-3 font-medium">{entry.action}</td>
      <td className="max-w-[24rem] px-4 py-3">
        <details>
          <summary className="cursor-pointer text-foreground">View details</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words text-xs">{detailText}</pre>
        </details>
      </td>
    </tr>
  )
}