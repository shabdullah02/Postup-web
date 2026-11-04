import Link from "next/link"
import { ArrowRight, CalendarCheck, Layers3, WandSparkles } from "lucide-react"
import AppPreview from "@/components/AppPreview"
import PricingSection from "@/components/PricingSection"
import { buttonVariants } from "@/components/ui/button"
import { content } from "@/lib/content"

export function ProductShowcase() {
  return (
    <section className="border-y border-border bg-muted/30 px-5 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">The workspace</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">A clear view of what goes out next.</h2>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-background shadow-xl shadow-black/5">
          <AppPreview />
        </div>
      </div>
    </section>
  )
}

export function MarketingSections() {
  return (
    <>
      <section aria-label="Early community" className="px-5 py-14">
        <div className="mx-auto max-w-6xl border-y border-border py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <p className="text-sm font-medium text-muted-foreground">{content.marketing.proofHeading}</p>
            <p className="text-xs text-muted-foreground">{content.marketing.proofNote}</p>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-5 text-lg font-semibold text-muted-foreground sm:grid-cols-4">
            {content.marketing.logos.map((logo) => <span key={logo}>{logo}</span>)}
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 px-5 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Features</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">Less tab-juggling. More thoughtful publishing.</h2>
          </div>
          <div className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {content.marketing.features.map((feature, index) => {
              const Icon = [Layers3, CalendarCheck, WandSparkles][index % 3]
              return (
                <article key={feature.title} className="border-t border-border pt-5">
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <ProductShowcase />

      <section className="px-5 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">How it works</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight md:text-5xl">A small, repeatable publishing loop.</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {content.marketing.steps.map((step) => (
              <li key={step.number} className="border-t border-border pt-5">
                <span className="text-sm font-semibold text-primary">{step.number}</span>
                <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <PricingSection />

      <section className="px-5 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Customer notes</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">A calmer way to keep the queue moving.</h2>
            </div>
            <p className="max-w-sm text-xs text-muted-foreground">Testimonials below are clearly marked placeholders. Replace them with approved customer quotes before publication.</p>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {content.marketing.testimonials.map((item) => (
              <figure key={item.role} className="flex flex-col justify-between rounded-xl border border-border p-5">
                <blockquote className="text-base leading-7">“{item.quote}”</blockquote>
                <figcaption className="mt-6 border-t border-border pt-4">
                  <span className="block text-sm font-semibold">{item.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{item.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 border-y border-border bg-muted/30 px-5 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Good to know.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">Need something else? <Link className="underline underline-offset-4" href="/contact">Talk to us.</Link></p>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {content.marketing.faq.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="cursor-pointer list-none pr-8 font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">{item.question}</summary>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 md:py-24">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-xl bg-primary px-6 py-10 text-primary-foreground md:flex-row md:items-center md:px-10 md:py-12">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Make your next week easier to publish.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 opacity-85">Build a queue, keep your accounts close, and spend more time on the work behind each post.</p>
          </div>
          <Link className={`${buttonVariants({ variant: "secondary" })} shrink-0`} href="/signup">Get started <ArrowRight aria-hidden="true" /></Link>
        </div>
      </section>
    </>
  )
}