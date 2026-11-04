"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AdminGate } from "@/components/AdminGate"

type ToastTone = "success" | "error"
type ToastMessage = { tone: ToastTone; text: string }
type AdminToastContextValue = { notify: (tone: ToastTone, text: string) => void }

const AdminToastContext = createContext<AdminToastContextValue | null>(null)
const navigation = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit-log", label: "Audit log" },
]

export function useAdminToast() {
  const context = useContext(AdminToastContext)
  if (!context) throw new Error("useAdminToast must be used within AdminShell")
  return context
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const notify = useCallback((tone: ToastTone, text: string) => {
    setToast({ tone, text })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 5000)
    return () => window.clearTimeout(timeout)
  }, [toast])

  return (
    <AdminToastContext.Provider value={{ notify }}>
      <AdminGate>
        <div className="mx-auto grid min-h-[70vh] max-w-7xl gap-7 px-5 py-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:py-12">
          <aside>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Administration</p>
            <nav aria-label="Admin navigation" className="mt-4 flex gap-2 overflow-x-auto lg:flex-col">
              {navigation.map((item) => {
                const active = pathname === item.href
                return (
                  <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
        {toast ? (
          <div role={toast.tone === "error" ? "alert" : "status"} className={`fixed bottom-5 right-5 z-[70] max-w-sm rounded-lg border bg-background px-4 py-3 text-sm shadow-lg ${toast.tone === "error" ? "border-destructive/40" : "border-primary/40"}`}>
            {toast.text}
          </div>
        ) : null}
      </AdminGate>
    </AdminToastContext.Provider>
  )
}