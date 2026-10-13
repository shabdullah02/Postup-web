"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"

type AuthGateProps = {
  children: React.ReactNode
}

export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login")
    }
  }, [isLoading, router, user])

  if (isLoading || !user) {
    return null
  }

  return children
}
