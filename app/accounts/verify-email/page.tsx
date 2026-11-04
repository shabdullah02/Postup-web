import { redirect } from "next/navigation"

export default async function LegacyVerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const { token } = await searchParams

  if (typeof token !== "string" || !token) {
    redirect("/verify-email")
  }

  redirect(`/verify-email/${encodeURIComponent(token)}`)
}
