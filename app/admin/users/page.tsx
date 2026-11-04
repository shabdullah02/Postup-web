import UsersClient from "./users-client"
import { AdminShell } from "@/components/admin/AdminShell"

export const instant = false

export default function Page() {
	return (
		<AdminShell>
			<UsersClient />
		</AdminShell>
	)
}