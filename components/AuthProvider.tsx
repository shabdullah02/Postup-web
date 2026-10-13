"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { me } from "@/lib/api"

export type AuthUser = Awaited<ReturnType<typeof me>>

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  refreshUser: () => Promise<AuthUser>
  clearUser: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    // The existing backend session endpoint is the source of truth for auth state.
    me()
      .then((authenticatedUser) => {
        if (isMounted) setUser(authenticatedUser)
      })
      .catch(() => {
        if (isMounted) setUser(null)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  async function refreshUser() {
    setIsLoading(true)
    try {
      const authenticatedUser = await me()
      setUser(authenticatedUser)
      return authenticatedUser
    } finally {
      setIsLoading(false)
    }
  }

  function clearUser() {
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, refreshUser, clearUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return auth
}