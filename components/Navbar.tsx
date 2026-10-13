"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronDown, Menu, Moon, Sun, X } from "lucide-react"
import FullBleedLine from "@/components/FullBleedLine"
import { useAuth } from "@/components/AuthProvider"
import { content } from "@/lib/content"

const menus = {
  Platforms: content.platforms,
  Resources: content.resources,
}

export default function Navbar() {
  const { user, isLoading } = useAuth()
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dark, setDark] = useState(false)

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
          <Link href="/" aria-label={`${content.appName} home`} className="flex shrink-0 items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-[5px] bg-[var(--logo-background)]">
              <span className="size-3 rounded-[2px] border-2 border-[var(--logo-foreground)]" />
            </span>
            <span className="text-base font-semibold text-[var(--primary-text)]">{content.appName}</span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-1 xl:flex">
            <Link href="/" className="rounded-[4px] px-2.5 py-2 text-sm font-medium text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--accent)]">Home</Link>
            <Link href="/#features" className="rounded-[4px] px-2.5 py-2 text-sm font-medium text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--accent)]">Features</Link>
            {Object.entries(menus).map(([label, items]) => (
              <div
                key={label}
                className="group relative"
                onMouseEnter={() => setActiveMenu(label)}
                onMouseLeave={() => setActiveMenu(null)}
              >
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={activeMenu === label}
                  onClick={() => setActiveMenu(activeMenu === label ? null : label)}
                  className="flex items-center gap-1 rounded-[4px] px-2.5 py-2 text-sm font-medium text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--accent)]"
                >
                  {label}<ChevronDown className="size-4" aria-hidden="true" />
                </button>
                <div
                  role="menu"
                  className={`absolute left-0 top-full min-w-48 rounded-[6px] border border-[var(--border-color)] bg-[var(--page-background)] p-2 ${activeMenu === label ? "block" : "hidden"}`}
                >
                  {items.map((item) => (
                    <Link
                      key={item}
                      role="menuitem"
                      href="#features"
                      onClick={() => setActiveMenu(null)}
                      className="block rounded-[4px] px-3 py-2 text-sm text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--accent)]"
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <Link href="/#pricing" className="rounded-[4px] px-2.5 py-2 text-sm font-medium text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--accent)]">Pricing</Link>
          </nav>
        </div>

        <div className="hidden shrink-0 items-center gap-5 xl:flex">
          {isLoading ? (
            <span className="h-9 w-36" aria-hidden="true" />
          ) : user ? (
            <Link href="/dashboard" className="rounded-[5px] bg-[var(--button-background)] px-3 py-2 text-sm font-medium text-[var(--button-foreground)] transition-colors duration-150 hover:bg-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="rounded-[4px] px-2.5 py-2 text-sm font-medium text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--accent)]">Log in</Link>
              <Link href="/signup" className="rounded-[5px] bg-[var(--button-background)] px-3 py-2 text-sm font-medium text-[var(--button-foreground)] transition-colors duration-150 hover:bg-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">Sign up</Link>
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
            <Link href="/" onClick={() => setMobileOpen(false)} className="rounded-[4px] px-3 py-3 text-sm text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--accent)]">Home</Link>
            <Link href="/#features" onClick={() => setMobileOpen(false)} className="rounded-[4px] px-3 py-3 text-sm text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--accent)]">Features</Link>
            {Object.entries(menus).map(([label, items]) => (
              <div key={label}>
                <button type="button" onClick={() => setActiveMenu(activeMenu === label ? null : label)} className="flex w-full items-center justify-between rounded-[4px] px-3 py-3 text-left text-sm text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--accent)]">
                  {label}<ChevronDown className="size-4" />
                </button>
                {activeMenu === label ? items.map((item) => (
                  <Link key={item} href="#features" onClick={() => setMobileOpen(false)} className="block px-6 py-2 text-sm text-[var(--secondary-text)]">{item}</Link>
                )) : null}
              </div>
            ))}
            <Link href="/#pricing" onClick={() => setMobileOpen(false)} className="rounded-[4px] px-3 py-3 text-sm text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--accent)]">Pricing</Link>
            {!isLoading ? (
              <div className="mt-2 flex gap-4 border-t border-[var(--border-color)] pt-3">
                {user ? (
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="rounded-[5px] bg-[var(--button-background)] px-3 py-2 text-sm text-[var(--button-foreground)] transition-colors duration-150 hover:bg-[var(--accent)]">Dashboard</Link>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-sm text-[var(--secondary-text)]">Log in</Link>
                    <Link href="/signup" onClick={() => setMobileOpen(false)} className="rounded-[5px] bg-[var(--button-background)] px-3 py-2 text-sm text-[var(--button-foreground)] transition-colors duration-150 hover:bg-[var(--accent)]">Sign up</Link>
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
