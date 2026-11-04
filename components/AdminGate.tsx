"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"

export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login")
    else if (!isLoading && user && !user.is_staff) router.replace("/dashboard")
  }, [isLoading, router, user])

  if (isLoading || !user?.is_staff) return null
  return children
}