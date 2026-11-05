"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { me } from "@/lib/api"

export type AuthUser = Awaited<ReturnType<typeof me>>

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  refresh: () => Promise<AuthUser>
  refreshUser: () => Promise<AuthUser>
  clearUser: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)
const protectedPaths = ["/accounts", "/select", "/billing", "/compose", "/dashboard", "/settings", "/admin", "/analytics"]

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
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

  useEffect(() => {
    function handleSessionEnded() {
      setUser(null)
    }

    window.addEventListener("postup:session-ended", handleSessionEnded)
    return () => window.removeEventListener("postup:session-ended", handleSessionEnded)
  }, [])

  useEffect(() => {
    function handleEmailVerified() {
      setUser((currentUser) => currentUser ? { ...currentUser, email_verified: true } : currentUser)
    }

    window.addEventListener("postup:email-verified", handleEmailVerified)
    return () => window.removeEventListener("postup:email-verified", handleEmailVerified)
  }, [])

  useEffect(() => {
    if (!user) return

    let isActive = true
    function refreshUserOnVisibilityChange() {
      if (document.visibilityState !== "visible") return
      me()
        .then((authenticatedUser) => {
          if (isActive) setUser(authenticatedUser)
        })
        .catch((error: unknown) => {
          if (isActive) console.error("Unable to refresh authentication state after returning to the tab.", error)
        })
    }

    document.addEventListener("visibilitychange", refreshUserOnVisibilityChange)
    return () => {
      isActive = false
      document.removeEventListener("visibilitychange", refreshUserOnVisibilityChange)
    }
  }, [user])

  const requiresAuth = pathname !== null && protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
  const requiresStaff = pathname?.startsWith("/admin/") || pathname === "/admin"

  useEffect(() => {
    if (!requiresAuth || isLoading) return
    if (!user) {
      router.replace("/login")
      return
    }
    if (requiresStaff && !user.is_staff && !user.is_superuser) {
      router.replace("/dashboard")
    }
  }, [isLoading, requiresAuth, requiresStaff, router, user])

  async function refresh(): Promise<AuthUser> {
    setIsLoading(true)
    try {
      const authenticatedUser = await me()
      setUser(authenticatedUser)
      return authenticatedUser
    } finally {
      setIsLoading(false)
    }
  }

  const refreshUser = refresh

  function clearUser() {
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, refresh, refreshUser, clearUser }}>
      {requiresAuth && (!user || (requiresStaff && !user.is_staff && !user.is_superuser))
        ? null
        : children}
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