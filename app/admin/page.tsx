import AdminClient from "./admin-client"
import { AdminShell } from "@/components/admin/AdminShell"

export const instant = false

export default function Page() {
  return (
    <AdminShell>
      <AdminClient />
    </AdminShell>
  )
}