"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useAuth } from "@/components/AuthProvider"
import HeroIllustration from "@/components/HeroIllustration"
import { content } from "@/lib/content"

export default function Hero() {
  const { user, isLoading } = useAuth()

  return (
    <section className="relative isolate overflow-hidden px-4 py-12 md:py-20">
      <div className="pointer-events-none relative z-0 mt-10 h-[18.75rem] w-full bg-[var(--accent-soft)] md:absolute md:inset-y-0 md:left-[48%] md:mt-0 md:h-full md:w-[80%]">
        <div className="h-full w-full opacity-40 md:opacity-100">
          <HeroIllustration />
        </div>
      </div>
      <div className="relative z-10 max-w-full md:max-w-[55%]">
        <h1 className="max-w-[650px] text-[clamp(40px,5vw,64px)] font-extrabold leading-[1.1] tracking-[-0.02em] text-[var(--primary-text)]">
          {content.headline.map((line, index) => (
            <span key={line} className="md:whitespace-nowrap">
              {index > 0 ? <br /> : null}
              {line}
            </span>
          ))}
        </h1>
        <p className="mt-[24px] max-w-[480px] text-[18px] leading-[1.6] text-[var(--secondary-text)]">
          {content.subheadline}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={user ? "/dashboard" : "/login"} onClick={(event) => { if (isLoading) event.preventDefault() }} aria-disabled={isLoading} className="inline-flex items-center gap-2 rounded-[5px] bg-[var(--button-background)] px-[24px] py-[12px] text-[15.2px] font-medium text-[var(--button-foreground)] transition-colors duration-150 hover:bg-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
            {content.primaryAction}<ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link href="#features" className="group inline-flex items-center gap-2 rounded-[5px] border border-[var(--border-color)] px-[24px] py-[12px] text-[15.2px] font-medium text-[var(--primary-text)] transition-colors duration-150 hover:bg-[var(--surface)]">
            {content.secondaryAction}
            <ArrowRight className="size-4 transition-colors duration-150 group-hover:text-[var(--accent)]" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
