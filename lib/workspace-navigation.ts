import {
  Add01Icon,
  Analytics01Icon,
  DashboardSquare01Icon,
  FileEditIcon,
  Settings01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"

export const workspaceNavigation = [
  { href: "/compose", label: "New post", icon: Add01Icon },
  { href: "/dashboard", label: "Dashboard", icon: DashboardSquare01Icon },
  { href: "/accounts", label: "Accounts", icon: UserGroupIcon },
  { href: "/analytics", label: "Analytics", icon: Analytics01Icon },
  { href: "/settings", label: "Settings", icon: Settings01Icon },
  { href: "/admin", label: "Admin", icon: FileEditIcon, adminOnly: true },
]
