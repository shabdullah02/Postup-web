import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Postup handles account, social connection, and product usage data.",
}

export default function PrivacyPage() {
  return (
    <main className="px-5 py-16 md:py-24">
      <article className="mx-auto max-w-3xl space-y-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Privacy</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Privacy policy</h1>
          <p className="mt-3 text-sm text-muted-foreground">Draft for operator review. Last updated October 15, 2026.</p>
        </header>
        <p className="leading-7 text-muted-foreground">This notice describes the information Postup may process when you create an account and use its social publishing tools. The operator should confirm the legal entity, retention periods, vendors, and applicable jurisdiction before publishing this policy as final.</p>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Information used by the service</h2>
          <p className="leading-7 text-muted-foreground">This includes account details you provide, posts and schedules you create, subscription and usage information, and technical information needed to operate and protect the service.</p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Connected social accounts</h2>
          <p className="leading-7 text-muted-foreground">When you connect a social account, Postup uses the permissions you approve to identify eligible Pages and support the publishing features you request. You can remove a connection from the account settings or revoke access through the social platform.</p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">How information is used</h2>
          <p className="leading-7 text-muted-foreground">Information is used to provide account access, save and schedule content, administer subscriptions, respond to support requests, and maintain service security. The service should not use connected-account data for unrelated purposes without an appropriate notice and legal basis.</p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Retention and deletion</h2>
          <p className="leading-7 text-muted-foreground">Retention periods depend on account state, legal requirements, and operational needs. To request deletion of your Postup account and associated data, follow the <Link href="/data-deletion" className="underline underline-offset-4">data deletion instructions</Link>.</p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="leading-7 text-muted-foreground">For privacy requests or questions, contact <a href="mailto:hello@postup.app" className="underline underline-offset-4">hello@postup.app</a>.</p>
        </section>
      </article>
    </main>
  )
}
