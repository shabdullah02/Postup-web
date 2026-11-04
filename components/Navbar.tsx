"use client"

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, Menu, Moon, Sun, X } from "lucide-react"
import FullBleedLine from "@/components/FullBleedLine"
import { useAuth } from "@/components/AuthProvider"
import { useBilling } from "@/components/BillingProvider"
import type { Profile } from "@/lib/api-types"
import { content } from "@/lib/content"
import { getProfile, logout } from "@/lib/api"

export default function Navbar() {
  const { user, isLoading, clearUser } = useAuth()
  const router = useRouter()
  const { billing, isLoading: isBillingLoading } = useBilling()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [profileState, setProfileState] = useState<{
    userId: number
    profile: Profile | null
    failed: boolean
  } | null>(null)

  useEffect(() => {
    if (!user) return
    let isActive = true
    getProfile()
      .then((profile) => {
        if (isActive) setProfileState({ userId: user.id, profile, failed: false })
      })
      .catch((error: unknown) => {
        if (!isActive) return
        console.error("Unable to load the account profile for the header.", error)
        setProfileState({ userId: user.id, profile: null, failed: true })
      })
    return () => {
      isActive = false
    }
  }, [user])

  useEffect(() => {
    try {
      // Sync with the theme class set by the inline script in layout.tsx
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDark(document.documentElement.classList.contains("dark"))
    } catch {
      // localStorage unavailable
    }
  }, [])

  function toggleTheme() {
    const nextDark = !dark
    document.documentElement.classList.toggle("dark", nextDark)
    try {
      localStorage.setItem("theme", nextDark ? "dark" : "light")
    } catch {
      // localStorage unavailable
    }
    setDark(nextDark)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[color-mix(in_srgb,var(--border-color)_50%,transparent)] bg-[rgba(255,255,255,0.6)] backdrop-blur-[12px] [-webkit-backdrop-filter:blur(12px)] dark:bg-[rgba(25,25,25,0.6)]">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-8 xl:gap-12">
          <Link href="/" aria-label={`${content.appName} home`} className="flex shrink-0 items-center">
            <span className="text-base font-semibold text-[var(--primary-text)]">{content.appName}</span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-1 xl:flex">
            <Link href="/#features" className="rounded-[4px] px-2.5 py-2 text-sm font-medium text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--accent)]">Features</Link>
            <Link href="/pricing" className="rounded-[4px] px-2.5 py-2 text-sm font-medium text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--accent)]">Pricing</Link>
            <Link href="/#faq" className="rounded-[4px] px-2.5 py-2 text-sm font-medium text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--accent)]">FAQ</Link>
          </nav>
        </div>

        <div className="hidden shrink-0 items-center gap-5 xl:flex">
          {isLoading ? (
            <span className="h-9 w-36" aria-hidden="true" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <AccountMenu
                user={user}
                profile={profileState?.userId === user.id ? profileState.profile : null}
                profileLoading={profileState?.userId !== user.id}
                profileFailed={profileState?.userId === user.id && profileState.failed}
                billing={billing}
                billingLoading={isBillingLoading}
                clearUser={clearUser}
                router={router}
                compact={false}
                id="desktop-account-menu"
              />
              {user.is_staff ? <Link href="/admin" className="rounded-[5px] px-2 py-2 text-sm font-medium text-[var(--secondary-text)] hover:text-[var(--accent)]">Admin</Link> : null}
              <Link href="/dashboard" className="rounded-[5px] bg-[var(--button-background)] px-3 py-2 text-sm font-medium text-[var(--button-foreground)] transition-colors duration-150 hover:bg-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">Dashboard</Link>
            </div>
          ) : (
            <>
              <Link href="/login" className="rounded-[4px] px-2.5 py-2 text-sm font-medium text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--accent)]">Log in</Link>
              <Link href="/signup" className="rounded-[5px] bg-[var(--button-background)] px-3 py-2 text-sm font-medium text-[var(--button-foreground)] transition-colors duration-150 hover:bg-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">Get started</Link>
            </>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
            title={`Switch to ${dark ? "light" : "dark"} theme`}
            className="flex size-9 items-center justify-center rounded-[4px] text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)]"
          >
            {dark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
          </button>
        </div>

        <div className="flex items-center gap-2 xl:hidden">
          {!isLoading && user ? (
            <AccountMenu
              user={user}
              profile={profileState?.userId === user.id ? profileState.profile : null}
              profileLoading={profileState?.userId !== user.id}
              profileFailed={profileState?.userId === user.id && profileState.failed}
              billing={billing}
              billingLoading={isBillingLoading}
              clearUser={clearUser}
              router={router}
              compact
              id="mobile-account-menu"
            />
          ) : null}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
            className="flex size-10 items-center justify-center rounded-[4px] text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)]"
          >
            {dark ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
          </button>
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex size-10 items-center justify-center rounded-[4px] text-[var(--primary-text)] transition-colors duration-150 hover:bg-[var(--surface)]"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <nav id="mobile-menu" aria-label="Mobile navigation" className="absolute left-0 right-0 top-full border-y border-[var(--border-color)] bg-[var(--page-background)] p-4 xl:hidden">
          <div className="flex flex-col gap-1">
            <Link href="/#features" onClick={() => setMobileOpen(false)} className="rounded-[4px] px-3 py-3 text-sm text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--accent)]">Features</Link>
            <Link href="/pricing" onClick={() => setMobileOpen(false)} className="rounded-[4px] px-3 py-3 text-sm text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--accent)]">Pricing</Link>
            <Link href="/#faq" onClick={() => setMobileOpen(false)} className="rounded-[4px] px-3 py-3 text-sm text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--accent)]">FAQ</Link>
            {!isLoading ? (
              <div className="mt-2 flex gap-4 border-t border-[var(--border-color)] pt-3">
                {user ? (
                  <>
                    {user.is_staff ? <Link href="/admin" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-sm text-[var(--secondary-text)]">Admin</Link> : null}
                    <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="rounded-[5px] bg-[var(--button-background)] px-3 py-2 text-sm text-[var(--button-foreground)] transition-colors duration-150 hover:bg-[var(--accent)]">Dashboard</Link>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-sm text-[var(--secondary-text)]">Log in</Link>
                    <Link href="/signup" onClick={() => setMobileOpen(false)} className="rounded-[5px] bg-[var(--button-background)] px-3 py-2 text-sm text-[var(--button-foreground)] transition-colors duration-150 hover:bg-[var(--accent)]">Get started</Link>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </nav>
      ) : null}
      <FullBleedLine className="bottom-0 opacity-50" />
    </header>
  )
}

function AccountMenu({
  user,
  profile,
  profileLoading,
  profileFailed,
  billing,
  billingLoading,
  clearUser,
  router,
  compact,
  id,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>
  profile: Profile | null
  profileLoading: boolean
  profileFailed: boolean
  billing: ReturnType<typeof useBilling>["billing"]
  billingLoading: boolean
  clearUser: () => void
  router: ReturnType<typeof useRouter>
  compact: boolean
  id: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [logoutError, setLogoutError] = useState("")

  const emailPrefix = profile?.email.split("@")[0]
  const displayName = profile?.first_name.trim() || user.username || emailPrefix || "Account"
  const fullName = [profile?.first_name.trim(), profile?.last_name.trim()].filter(Boolean).join(" ") || displayName
  const initial = (profile?.first_name.trim() || user.username || emailPrefix || "A").charAt(0).toUpperCase()
  const planName = billing ? `${billing.plan.charAt(0).toUpperCase()}${billing.plan.slice(1)}` : null

  useEffect(() => {
    if (!open) return

    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true })

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    const currentIndex = items.indexOf(document.activeElement as HTMLElement)
    let nextIndex: number | null = null

    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % items.length
    if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + items.length) % items.length
    if (event.key === "Home") nextIndex = 0
    if (event.key === "End") nextIndex = items.length - 1
    if (event.key === "Tab") setOpen(false)

    if (nextIndex !== null && items.length > 0) {
      event.preventDefault()
      items[nextIndex]?.focus()
    }
  }

  async function handleLogout() {
    setLogoutError("")
    try {
      await logout()
      clearUser()
      setOpen(false)
      router.replace("/login")
    } catch (error) {
      console.error("Unable to log out from the account menu.", error)
      setLogoutError("Unable to log out. Please try again.")
    }
  }

  const itemClassName = "flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-[var(--primary-text)] outline-none hover:bg-[var(--surface)] focus-visible:bg-[var(--surface)]"

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-dropdown`}
        aria-label={`Account menu for ${displayName}`}
        onClick={() => {
          setLogoutError("")
          setOpen((current) => !current)
        }}
        className="flex max-w-[13rem] items-center gap-2 rounded-md p-1.5 text-left text-[var(--primary-text)] outline-none transition-colors hover:bg-[var(--surface)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface)] text-sm font-semibold" aria-hidden="true">
          {initial}
        </span>
        <span className="flex min-w-0 flex-col items-start">
          <span className={`max-w-full truncate text-sm font-medium ${compact ? "max-w-12" : "max-w-32"}`}>{displayName}</span>
          {billingLoading ? (
            <span className="mt-1 h-3 w-9 animate-pulse rounded bg-muted" role="status" aria-label="Loading plan" />
          ) : (
            <span className="mt-0.5 rounded-full border border-[var(--border-color)] bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-medium leading-none text-[var(--secondary-text)]">
              {planName ?? "Plan unavailable"}
            </span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-[var(--secondary-text)]" aria-hidden="true" />
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={`${id}-dropdown`}
          role="menu"
          aria-label="Account options"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full z-[60] mt-2 max-h-[min(70vh,28rem)] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-[var(--border-color)] bg-[var(--page-background)] p-2 text-[var(--primary-text)] shadow-lg"
        >
          <div role="group" aria-label="Account details" className="px-3 py-2">
            <p className="truncate text-sm font-semibold">{fullName}</p>
            <p className="truncate text-xs text-[var(--secondary-text)]">
              {profile ? profile.email : profileLoading ? "Loading email..." : profileFailed ? "Email unavailable" : ""}
            </p>
            <p className="mt-1 inline-flex w-fit rounded-full border border-[var(--border-color)] bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--secondary-text)]">
              {billingLoading ? "Loading plan..." : planName ?? "Plan unavailable"}
            </p>
          </div>
          <div role="separator" className="my-1 border-t border-[var(--border-color)]" />
          <Link href="/billing" role="menuitem" tabIndex={-1} className={itemClassName} onClick={() => setOpen(false)}>
            Upgrade plan
          </Link>
          <Link href="/billing" role="menuitem" tabIndex={-1} className={itemClassName} onClick={() => setOpen(false)}>
            Billing
          </Link>
          <Link href="/settings" role="menuitem" tabIndex={-1} className={itemClassName} onClick={() => setOpen(false)}>
            Settings
          </Link>
          <Link href="/contact" role="menuitem" tabIndex={-1} className={itemClassName} onClick={() => setOpen(false)}>
            Help / Support
          </Link>
          <div role="separator" className="my-1 border-t border-[var(--border-color)]" />
          {logoutError ? <p role="alert" className="px-3 py-2 text-sm text-destructive">{logoutError}</p> : null}
          <button type="button" role="menuitem" tabIndex={-1} className={itemClassName} onClick={() => void handleLogout()}>
            Log out
          </button>
        </div>
      ) : null}
    </div>
  )
}
