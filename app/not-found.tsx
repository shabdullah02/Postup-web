import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-5 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">404</p>
      <h1 className="mt-3 text-3xl font-semibold">We couldn’t find that page.</h1>
      <p className="mt-3 text-muted-foreground">The link may be outdated or the page may have moved.</p>
      <Link className={`${buttonVariants()} mt-6 w-fit`} href="/">Return home</Link>
    </main>
  )
}