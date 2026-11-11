"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { useAdminToast } from "@/components/admin/AdminShell"
import {
  ApiError,
  deactivateContractAdminUser,
  deleteAdminUser,
  getContractAdminUser,
  listContractAdminUsers,
  reactivateContractAdminUser,
  resetAdminUserTwoFactor,
  updateContractAdminSubscription,
  verifyAdminUserEmail,
} from "@/lib/api"
import type { AdminUser, AdminUserDetail } from "@/lib/api-types"

const PAGE_SIZE = 20
const planOptions = ["free", "pro", "agency"]

function dateLabel(value?: string | null) {
  if (!value) return "Never"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString()
}

function actionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.code === "protected_user") {
    return "This superuser account is protected from this action."
  }
  return error instanceof Error ? error.message : fallback
}

export default function UsersClient() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)
  const [busyUserId, setBusyUserId] = useState<number | null>(null)
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null)
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const { notify } = useAdminToast()

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setLoadError("")
    listContractAdminUsers({ search: search.trim(), plan: planFilter, status: statusFilter, page, page_size: PAGE_SIZE })
      .then((data) => {
        if (!isMounted) return
        const rows = data?.results ?? []
        setUsers(rows)
        setTotal(data?.count ?? rows.length)
      })
      .catch((error: unknown) => {
        if (isMounted) setLoadError(error instanceof Error ? error.message : "Unable to load users.")
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [search, planFilter, statusFilter, page, reloadKey])

  async function changePlan(user: AdminUser, plan: string) {
    setBusyUserId(user.id)
    try {
      await updateContractAdminSubscription(user.id, { plan: plan as AdminUser["plan"] })
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, plan: plan as AdminUser["plan"] } : item))
      notify("success", `Updated ${user.username} to the ${plan} plan.`)
    } catch (error) {
      notify("error", actionErrorMessage(error, "Unable to update plan."))
    } finally {
      setBusyUserId(null)
    }
  }

  async function changeSubscriptionStatus(user: AdminUser, nextStatus: "active" | "suspended") {
    setBusyUserId(user.id)
    try {
      await updateContractAdminSubscription(user.id, { status: nextStatus })
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, status: nextStatus } : item))
      notify("success", `${user.username} is now ${nextStatus}.`)
    } catch (error) {
      notify("error", actionErrorMessage(error, "Unable to update subscription status."))
    } finally {
      setBusyUserId(null)
    }
  }

  async function changeActiveState(user: AdminUser) {
    const isActive = user.is_active ?? !["inactive", "deactivated"].includes(user.status.toLowerCase())
    setBusyUserId(user.id)
    try {
      if (isActive) await deactivateContractAdminUser(user.id)
      else await reactivateContractAdminUser(user.id)
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, is_active: !isActive } : item))
      notify("success", `${user.username} ${isActive ? "deactivated" : "reactivated"}.`)
    } catch (error) {
      notify("error", actionErrorMessage(error, "Unable to update account access."))
    } finally {
      setBusyUserId(null)
    }
  }

  async function openDetails(user: AdminUser) {
    setDetailUser(user)
    setDetail(null)
    setDetailError("")
    setDetailLoading(true)
    try {
      const userDetail = await getContractAdminUser(user.id)
      setDetail(userDetail)
      if (userDetail.is_superuser) {
        setUsers((current) => current.map((item) => item.id === user.id ? { ...item, is_superuser: true } : item))
      }
    } catch (error) {
      setDetailError(actionErrorMessage(error, "Unable to load user details."))
    } finally {
      setDetailLoading(false)
    }
  }

  async function resetTwoFactor(user: AdminUser) {
    if (!window.confirm(`Reset two-factor authentication for ${user.username}?`)) return
    setBusyUserId(user.id)
    try {
      await resetAdminUserTwoFactor(user.id)
      notify("success", `Reset two-factor authentication for ${user.username}.`)
    } catch (error) {
      notify("error", actionErrorMessage(error, "Unable to reset two-factor authentication."))
    } finally {
      setBusyUserId(null)
    }
  }

  async function verifyEmail(user: AdminUser) {
    if (!window.confirm(`Mark ${user.username}'s email address as verified?`)) return
    setBusyUserId(user.id)
    try {
      await verifyAdminUserEmail(user.id)
      notify("success", `Verified ${user.username}'s email address.`)
      if (detailUser?.id === user.id) await openDetails(user)
    } catch (error) {
      notify("error", actionErrorMessage(error, "Unable to verify email."))
    } finally {
      setBusyUserId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteConfirmation !== deleteTarget.username) return
    setBusyUserId(deleteTarget.id)
    try {
      await deleteAdminUser(deleteTarget.id, deleteTarget.username)
      setUsers((current) => current.filter((user) => user.id !== deleteTarget.id))
      setTotal((current) => Math.max(0, current - 1))
      notify("success", `Deleted ${deleteTarget.username}.`)
      setDeleteTarget(null)
      setDeleteConfirmation("")
    } catch (error) {
      notify("error", actionErrorMessage(error, "Unable to delete user."))
    } finally {
      setBusyUserId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
        <p className="mt-2 text-muted-foreground">Search accounts, review subscriptions, and manage access.</p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Input aria-label="Search users" placeholder="Search name or email" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); setIsLoading(true) }} className="max-w-sm" />
        <select aria-label="Filter by plan" className="h-10 rounded-lg border border-input bg-background px-3 text-sm" value={planFilter} onChange={(event) => { setPlanFilter(event.target.value); setPage(1); setIsLoading(true) }}>
          <option value="">All plans</option>
          {planOptions.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
        </select>
        <select aria-label="Filter by status" className="h-10 rounded-lg border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); setIsLoading(true) }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loadError ? (
        <div className="space-y-3 rounded-lg border border-destructive/30 p-5">
          <p role="alert" className="text-sm text-destructive">{loadError}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => setReloadKey((key) => key + 1)}>Retry</Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3" aria-label="Loading users">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-lg border border-border bg-muted/40" />)}
        </div>
      ) : users.length === 0 ? (
        <p className="rounded-lg border border-border p-6 text-sm text-muted-foreground">No users match this search.</p>
      ) : (
        <Card className="overflow-x-auto rounded-xl">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>{["User", "Plan", "Status", "Joined", "Actions"].map((heading) => <th key={heading} scope="col" className="px-4 py-3 font-medium">{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => {
                const isActive = user.is_active ?? !["inactive", "deactivated"].includes(user.status.toLowerCase())
                const isSuspended = user.status.toLowerCase() === "suspended"
                const isSuperuser = user.is_superuser === true
                const isBusy = busyUserId === user.id
                return (
                  <tr key={user.id}>
                    <td className="px-4 py-4"><span className="block font-medium">{user.username}</span><span className="mt-1 block text-xs text-muted-foreground">{user.email}</span></td>
                    <td className="px-4 py-4">
                      <select aria-label={`Plan for ${user.username}`} value={user.plan.toLowerCase()} disabled={isBusy} onChange={(event) => void changePlan(user, event.target.value)} className="h-9 rounded-md border border-input bg-background px-2">
                        {planOptions.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-4"><Badge variant={isSuspended || !isActive ? "destructive" : "secondary"}>{user.status}</Badge></td>
                    <td className="px-4 py-4 text-muted-foreground">{dateLabel(user.date_joined)}</td>
                    <td className="min-w-[340px] px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => void openDetails(user)}>Details</Button>
                        {!isSuperuser ? <Button type="button" size="sm" variant="outline" disabled={isBusy} onClick={() => void resetTwoFactor(user)}>Reset 2FA</Button> : null}
                        <Button type="button" size="sm" variant="outline" disabled={isBusy} onClick={() => void verifyEmail(user)}>Verify email</Button>
                        {!isSuperuser ? <Button type="button" size="sm" variant="outline" disabled={isBusy} onClick={() => void changeSubscriptionStatus(user, isSuspended ? "active" : "suspended")}>{isSuspended ? "Unsuspend" : "Suspend"}</Button> : null}
                        {!isSuperuser ? <Button type="button" size="sm" variant="outline" disabled={isBusy} onClick={() => void changeActiveState(user)}>{isActive ? "Deactivate" : "Reactivate"}</Button> : null}
                        {!isSuperuser ? <Button type="button" size="sm" variant="destructive" disabled={isBusy} onClick={() => { setDeleteTarget(user); setDeleteConfirmation("") }}>Delete</Button> : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      <div className="flex items-center justify-between gap-4 text-sm">
        <p className="text-muted-foreground">{total} users · Page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={page <= 1 || isLoading} onClick={() => { setPage((current) => current - 1); setIsLoading(true) }}>Previous</Button>
          <Button type="button" size="sm" variant="outline" disabled={page >= totalPages || isLoading} onClick={() => { setPage((current) => current + 1); setIsLoading(true) }}>Next</Button>
        </div>
      </div>

      {detailUser ? (
        <div className="fixed inset-0 z-[80] flex justify-end bg-[var(--overlay)]" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailUser(null) }}>
          <aside role="dialog" aria-modal="true" aria-labelledby="admin-user-detail-title" className="h-full w-full max-w-xl overflow-y-auto bg-background p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="admin-user-detail-title" className="text-xl font-semibold">{detailUser.username}</h2><p className="mt-1 text-sm text-muted-foreground">{detailUser.email}</p></div>
              <Button type="button" variant="outline" size="sm" onClick={() => setDetailUser(null)}>Close</Button>
            </div>
            {detailLoading ? <p role="status" className="mt-8 text-sm text-muted-foreground">Loading user details...</p> : null}
            {detailError ? <div className="mt-8 space-y-3"><p role="alert" className="text-sm text-destructive">{detailError}</p><Button type="button" size="sm" variant="outline" onClick={() => void openDetails(detailUser)}>Retry</Button></div> : null}
            {!detailLoading && !detailError && detail ? (
              <div className="mt-8 space-y-8">
                <section>
                  <h3 className="font-semibold">Account security and verification</h3>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div><dt className="text-sm text-muted-foreground">Email verified</dt><dd className="mt-1 text-sm">{detail.email_verified ? "Yes" : "No"}</dd></div>
                    <div><dt className="text-sm text-muted-foreground">Two-factor authentication</dt><dd className="mt-1 text-sm">{detail.totp_enabled ? "Enabled" : "Disabled"}</dd></div>
                    <div><dt className="text-sm text-muted-foreground">Trial ends</dt><dd className="mt-1 text-sm">{dateLabel(detail.trial_ends_at)}</dd></div>
                    <div><dt className="text-sm text-muted-foreground">Cancel at period end</dt><dd className="mt-1 text-sm">{detail.cancel_at_period_end ? "Yes" : "No"}</dd></div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!detail.is_superuser ? <Button type="button" size="sm" variant="outline" disabled={busyUserId === detail.id} onClick={() => void resetTwoFactor(detail)}>Reset 2FA</Button> : null}
                    {!detail.email_verified ? <Button type="button" size="sm" variant="outline" disabled={busyUserId === detail.id} onClick={() => void verifyEmail(detail)}>Verify email</Button> : null}
                  </div>
                </section>
                <section>
                  <h3 className="font-semibold">Subscription</h3>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div><dt className="text-sm text-muted-foreground">Plan</dt><dd className="mt-1 text-sm capitalize">{detail.subscription?.plan ?? detail.plan}</dd></div>
                    <div><dt className="text-sm text-muted-foreground">Status</dt><dd className="mt-1 text-sm capitalize">{detail.subscription?.status ?? detail.status}</dd></div>
                    <div><dt className="text-sm text-muted-foreground">Current period ends</dt><dd className="mt-1 text-sm">{dateLabel(detail.subscription?.current_period_end)}</dd></div>
                  </dl>
                </section>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-[var(--overlay-strong)] p-5">
          <section role="dialog" aria-modal="true" aria-labelledby="delete-user-title" className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl">
            <h2 id="delete-user-title" className="text-lg font-semibold">Delete {deleteTarget.username}?</h2>
            <p className="mt-2 text-sm text-muted-foreground">This permanently deletes the user. Type the username to confirm.</p>
            <Input autoFocus className="mt-4" aria-label="Type username to confirm deletion" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} />
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button type="button" variant="destructive" disabled={deleteConfirmation !== deleteTarget.username || busyUserId === deleteTarget.id} onClick={() => void confirmDelete()}>Delete user</Button>
            </div>
          </section>
        </div>
      ) : null}

    </div>
  )
}