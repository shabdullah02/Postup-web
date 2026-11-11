"use client"

import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-5 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">Something went wrong</p>
      <h1 className="mt-3 text-3xl font-semibold">This page could not be loaded.</h1>
      <p className="mt-3 text-muted-foreground">Try again, or return to the Postup home page.</p>
      <div className="mt-6 flex gap-3">
        <Button type="button" onClick={retry}>Try again</Button>
        <Link className={buttonVariants({ variant: "outline" })} href="/">Home</Link>
      </div>
    </main>
  )
}