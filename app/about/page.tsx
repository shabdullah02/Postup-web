import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "About",
  description: "Learn about Postup and the publishing workflow it is built to support.",
}

export default function AboutPage() {
  return (
    <main className="px-5 py-16 md:py-24">
      <article className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">About Postup</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">A little more room to do the work behind the post.</h1>
        <p className="mt-7 text-lg leading-8 text-muted-foreground">Postup is a social publishing workspace designed to make planning feel clear and manageable. It brings drafts, connected accounts, and scheduled posts into one place so creators and small teams can spend less time coordinating their queue.</p>
        <div className="mt-12 grid gap-8 border-y border-border py-8 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold">A focused tool</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">We keep the workflow centered on the practical work: prepare a post, check its destination, and decide when it should go out.</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Built with care</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Postup is evolving with its users. We welcome thoughtful feedback about the channels, controls, and details that help publishing teams work better.</p>
          </div>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">Questions or feedback? <Link href="/contact" className="underline underline-offset-4">Contact the Postup team.</Link></p>
      </article>
    </main>
  )
}