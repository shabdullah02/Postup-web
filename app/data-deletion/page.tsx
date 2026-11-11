import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Data deletion instructions",
  description: "Instructions for requesting deletion of your Postup account and associated data.",
}

export default function DataDeletionPage() {
  return (
    <main className="px-5 py-16 md:py-24">
      <article className="mx-auto max-w-3xl space-y-7">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">Account data</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Request data deletion</h1>
          <p className="mt-4 leading-7 text-muted-foreground">You can request deletion of your Postup account and associated data at any time.</p>
        </header>
        <ol className="list-decimal space-y-4 pl-6 leading-7 text-muted-foreground">
          <li>Email <a className="underline underline-offset-4" href="mailto:hello@postup.app?subject=Postup%20data%20deletion">hello@postup.app</a> from the address associated with your Postup account.</li>
          <li>Use the subject line “Postup data deletion” and include your account email and, if relevant, the connected social account you want removed.</li>
          <li>We may ask you to verify ownership before processing the request. The operator should confirm its response and retention timelines before launch.</li>
        </ol>
        <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">Removing Postup data does not automatically delete content already published on Facebook or another platform. Remove or delete that content in the relevant platform separately. You can also revoke Postup’s access from that platform’s settings.</p>
      </article>
    </main>
  )
}