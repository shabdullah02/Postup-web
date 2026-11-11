import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms",
  description: "Draft terms for using the Postup social publishing service.",
}

export default function TermsPage() {
  return (
    <main className="px-5 py-16 md:py-24">
      <article className="mx-auto max-w-3xl space-y-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">Legal</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Terms of service</h1>
          <p className="mt-3 text-sm text-muted-foreground">Draft for operator and legal review. Last updated October 15, 2026.</p>
        </header>
        <p className="leading-7 text-muted-foreground">These draft terms describe general expectations for using Postup. The service operator should have this document reviewed and complete the legal entity, governing law, payment, and liability terms before launch.</p>
        <section className="space-y-3"><h2 className="text-xl font-semibold">Your account</h2><p className="leading-7 text-muted-foreground">You are responsible for keeping your sign-in credentials secure and for activity performed through your account. Provide accurate account information and contact support if you believe your account has been accessed without permission.</p></section>
        <section className="space-y-3"><h2 className="text-xl font-semibold">Your content and connected accounts</h2><p className="leading-7 text-muted-foreground">You retain responsibility for the content you create and publish, including its accuracy, rights, and compliance with platform rules. You must have authority to connect and manage each social account used with Postup.</p></section>
        <section className="space-y-3"><h2 className="text-xl font-semibold">Plans and billing</h2><p className="leading-7 text-muted-foreground">Plan limits, prices, renewal dates, and cancellation options are shown in the product or billing portal. Draft plan prices on the marketing site must be reconciled with the live billing catalog before these terms are finalized.</p></section>
        <section className="space-y-3"><h2 className="text-xl font-semibold">Service changes and termination</h2><p className="leading-7 text-muted-foreground">Postup may update features as the service develops. Account suspension, termination, data export, and retention provisions require final operator and legal review.</p></section>
        <section className="space-y-3"><h2 className="text-xl font-semibold">Contact</h2><p className="leading-7 text-muted-foreground">Questions about these terms can be sent to <a href="mailto:hello@postup.app" className="underline underline-offset-4">hello@postup.app</a>.</p></section>
      </article>
    </main>
  )
}