import type { Metadata } from "next"
import ContactForm from "@/components/ContactForm"
import { content } from "@/lib/content"

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the Postup team with product, account, or billing questions.",
}

export default function ContactPage() {
  return (
    <main className="px-5 py-16 md:py-24">
      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[0.8fr_1.2fr]">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">Contact</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Let’s talk.</h1>
          <p className="mt-4 text-muted-foreground">Send a note about your account, a question about Postup, or feedback about the workflow.</p>
          <a className="mt-6 inline-block text-sm underline underline-offset-4" href={`mailto:${content.marketing.contactEmail}`}>{content.marketing.contactEmail}</a>
        </header>
        <ContactForm />
      </div>
    </main>
  )
}