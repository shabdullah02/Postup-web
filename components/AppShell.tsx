"use client"

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Analytics01Icon,
  DashboardSquare01Icon,
  FileEditIcon,
  Settings01Icon,
  SidebarLeftIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { useAuth } from "@/components/AuthProvider"

const authenticatedPaths = ["/accounts", "/billing", "/compose", "/dashboard", "/settings", "/admin", "/analytics"]
const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardSquare01Icon },
  { href: "/accounts", label: "Accounts", icon: UserGroupIcon },
  { href: "/analytics", label: "Analytics", icon: Analytics01Icon },
  { href: "/settings", label: "Settings", icon: Settings01Icon },
]

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const showSidebar = Boolean(user && pathname && authenticatedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  ))

  if (!showSidebar) return <>{children}</>

  return (
    <div className="relative min-h-[70vh] pl-16">
      <AppSidebar />
      {children}
    </div>
  )
}

function AppSidebar() {
  const pathname = usePathname()
  const sidebarRef = useRef<HTMLElement>(null)
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    function collapseOutside(event: globalThis.PointerEvent) {
      if (event.pointerType === "touch" && !sidebarRef.current?.contains(event.target as Node)) {
        setExpanded(false)
      }
    }

    document.addEventListener("pointerdown", collapseOutside)
    return () => document.removeEventListener("pointerdown", collapseOutside)
  }, [])

  function handlePointerEnter(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "touch") setExpanded(true)
  }

  function handlePointerLeave(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "touch") setExpanded(false)
  }

  return (
    <aside
      ref={sidebarRef}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      aria-label="Application sidebar"
      className={`fixed top-16 z-40 flex h-[calc(100dvh-4rem)] flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm transition-[width] duration-200 ease-out ${expanded ? "w-64" : "w-16"}`}
      style={{ left: "max(0px, calc((100vw - 75rem) / 2))" }}
    >
      <div className="flex h-14 shrink-0 items-center px-2">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={expanded}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <HugeiconsIcon icon={SidebarLeftIcon} strokeWidth={2} className="size-5" aria-hidden="true" />
        </button>
        <span className={`overflow-hidden whitespace-nowrap pl-3 text-sm font-medium transition-opacity duration-150 ${expanded ? "opacity-100" : "opacity-0"}`}>
          Workspace
        </span>
      </div>

      <div className="px-2 pb-3">
        <SidebarLink href="/compose" label="New post" icon={Add01Icon} expanded={expanded} active={pathname === "/compose"} />
      </div>

      <nav aria-label="Workspace navigation" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2">
        {navigation.map((item) => (
          <SidebarLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            expanded={expanded}
            active={pathname === item.href || pathname?.startsWith(`${item.href}/`)}
          />
        ))}
        {user?.is_staff || user?.is_superuser ? (
          <SidebarLink
            href="/admin"
            label="Admin"
            icon={FileEditIcon}
            expanded={expanded}
            active={pathname === "/admin" || pathname?.startsWith("/admin/")}
          />
        ) : null}
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
  icon: typeof Add01Icon
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
      <span className={`overflow-hidden whitespace-nowrap pl-3 transition-opacity duration-150 ${expanded ? "opacity-100" : "opacity-0"}`}>
        {label}
      </span>
    </Link>
  )
}
