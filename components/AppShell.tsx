"use client"

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { SidebarLeftIcon } from "@hugeicons/core-free-icons"
import { useAuth } from "@/components/AuthProvider"
import { workspaceNavigation } from "@/lib/workspace-navigation"

const authenticatedPaths = ["/accounts", "/billing", "/compose", "/dashboard", "/settings", "/admin", "/analytics"]

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const showSidebar = Boolean(user && pathname && authenticatedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  ))

  if (!showSidebar) return <>{children}</>

  return (
    <div className="flex min-h-[70vh]">
      <AppSidebar />
      <div className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  )
}

function AppSidebar() {
  const pathname = usePathname()
  const sidebarRef = useRef<HTMLElement>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    function clearHoverTimer() {
      if (hoverTimerRef.current !== null) {
        clearTimeout(hoverTimerRef.current)
        hoverTimerRef.current = null
      }
    }

    function collapseOutside(event: globalThis.PointerEvent) {
      if (event.pointerType === "touch" && !sidebarRef.current?.contains(event.target as Node)) {
        clearHoverTimer()
        setExpanded(false)
      }
    }

    document.addEventListener("pointerdown", collapseOutside)
    return () => {
      clearHoverTimer()
      document.removeEventListener("pointerdown", collapseOutside)
    }
  }, [])

  function handlePointerEnter(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") return
    if (hoverTimerRef.current !== null) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      hoverTimerRef.current = null
      setExpanded(true)
    }, 100)
  }

  function handlePointerLeave(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") return
    if (hoverTimerRef.current !== null) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      hoverTimerRef.current = null
      setExpanded(false)
    }, 150)
  }

  function toggleExpanded() {
    if (hoverTimerRef.current !== null) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    setExpanded((current) => !current)
  }

  return (
    <aside
      ref={sidebarRef}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      aria-label="Application sidebar"
      className={`sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm transition-[width] duration-[325ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none md:flex ${expanded ? "w-64" : "w-16"}`}
    >
      <div className="flex h-14 shrink-0 items-center px-2">
        <button
          type="button"
          onClick={toggleExpanded}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={expanded}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <HugeiconsIcon icon={SidebarLeftIcon} strokeWidth={2} className="size-5" aria-hidden="true" />
        </button>
        <span className={`overflow-hidden whitespace-nowrap pl-3 text-sm font-medium transition-opacity ease-in-out motion-reduce:transition-none ${expanded ? "opacity-100 delay-125 duration-150" : "opacity-0 delay-0 duration-75"}`}>
          Workspace
        </span>
      </div>

      <nav aria-label="Workspace navigation" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2">
        {workspaceNavigation
          .filter((item) => !item.adminOnly || user?.is_staff || user?.is_superuser)
          .map((item) => (
            <SidebarLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              expanded={expanded}
              active={pathname === item.href || pathname?.startsWith(`${item.href}/`)}
            />
          ))}
      </nav>
    </aside>
  )
}

function SidebarLink({
  href,
  label,
  icon,
  expanded,
  active,
}: {
  href: string
  label: string
  icon: (typeof workspaceNavigation)[number]["icon"]
  expanded: boolean
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      title={label}
      className={`flex h-10 shrink-0 items-center rounded-lg px-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
    >
      <HugeiconsIcon icon={icon} strokeWidth={2} className="size-5 shrink-0" aria-hidden="true" />
      <span className={`overflow-hidden whitespace-nowrap pl-3 transition-opacity ease-in-out motion-reduce:transition-none ${expanded ? "opacity-100 delay-125 duration-150" : "opacity-0 delay-0 duration-75"}`}>
        {label}
      </span>
    </Link>
  )
}
