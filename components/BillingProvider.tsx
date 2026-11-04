"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useAuth } from "@/components/AuthProvider"
import { getBilling, type BillingSummary } from "@/lib/api"

type BillingContextValue = {
  billing: BillingSummary | null
  isLoading: boolean
  refreshBilling: () => Promise<BillingSummary>
}

const BillingContext = createContext<BillingContextValue | null>(null)

export function BillingProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [snapshot, setSnapshot] = useState<{ userId: number; billing: BillingSummary | null } | null>(null)
  const billing = snapshot && snapshot.userId === user?.id ? snapshot.billing : null
  const isLoading = isAuthLoading || Boolean(user && snapshot?.userId !== user.id)

  useEffect(() => {
    if (isAuthLoading || !user) return
    let isMounted = true
    getBilling()
      .then((result) => {
        if (isMounted) setSnapshot({ userId: user.id, billing: result })
      })
      .catch(() => {
        if (isMounted) setSnapshot({ userId: user.id, billing: null })
      })
    return () => {
      isMounted = false
    }
  }, [isAuthLoading, user])

  async function refreshBilling() {
    if (!user) throw new Error("Sign in to view billing.")
    const result = await getBilling()
    setSnapshot({ userId: user.id, billing: result })
    return result
  }

  return (
    <BillingContext.Provider value={{ billing, isLoading, refreshBilling }}>
      {children}
    </BillingContext.Provider>
  )
}

export function useBilling() {
  const context = useContext(BillingContext)
  if (!context) throw new Error("useBilling must be used within BillingProvider")
  return context
}