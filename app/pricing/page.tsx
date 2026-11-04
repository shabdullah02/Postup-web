import type { Metadata } from "next"
import PricingSection from "@/components/PricingSection"

export const metadata: Metadata = {
  title: "Pricing",
  description: "Compare Postup Free, Pro, and Agency plans.",
}

export default function PricingPage() {
  return (
    <main>
      <header className="px-5 pb-4 pt-14 text-center md:pt-20">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Straightforward plans for your publishing rhythm.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Choose a starting point, then adjust as your accounts and workflow grow.</p>
      </header>
      <PricingSection />
    </main>
  )
}
