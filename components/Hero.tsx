import Link from "next/link"
import { ArrowRight } from "lucide-react"
import PlatformTile from "@/components/PlatformTile"
import { platforms } from "@/lib/platforms"

const platformNames = platforms.map((platform) => platform.name)
const supportLine = `Supports ${platformNames.slice(0, -1).join(", ")} and ${platformNames[platformNames.length - 1]}.`

function GhostTiles() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 560 520"
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
    >
      <g className="fill-none stroke-foreground/[0.12]" strokeWidth="1">
        <g transform="translate(330 10) scale(1.05)">
          <path d="M110 0 220 55 110 110 0 55Z" />
          <path d="M0 55 110 110 110 140 0 85Z" />
          <path d="M110 110 220 55 220 85 110 140Z" />
        </g>
        <g transform="translate(250 300) scale(0.8)">
          <path d="M110 0 220 55 110 110 0 55Z" />
          <path d="M0 55 110 110 110 140 0 85Z" />
          <path d="M110 110 220 55 220 85 110 140Z" />
        </g>
      </g>
      <g className="fill-foreground/[0.045] stroke-foreground/[0.12]" strokeWidth="1">
        <g transform="translate(370 250) scale(0.55)">
          <path d="M110 0 220 55 110 110 0 55Z" />
          <path d="M0 55 110 110 110 140 0 85Z" />
          <path d="M110 110 220 55 220 85 110 140Z" />
        </g>
        <g transform="translate(60 150) scale(0.4)">
          <path d="M110 0 220 55 110 110 0 55Z" />
          <path d="M0 55 110 110 110 140 0 85Z" />
          <path d="M110 110 220 55 220 85 110 140Z" />
        </g>
      </g>
    </svg>
  )
}

export default function Hero() {
  return (
    <section
      aria-labelledby="landing-hero-title"
      className="px-5 py-20 sm:px-8 lg:px-10 lg:py-28"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2 lg:gap-10">
        <div className="min-w-0 max-w-3xl">
          <h1
            id="landing-hero-title"
            className="text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-foreground"
          >
            <span className="block">Schedule once.</span>
            <span className="block">Post everywhere</span>
            <span className="block">you&rsquo;re active.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Plan your content, keep your publishing queue full, and track follower and reach
            analytics for Facebook, Instagram and Threads, all from one calm workspace.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="inline-flex min-h-11 items-center gap-2 border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Start for free
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="#features"
              className="inline-flex min-h-11 items-center border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              See how it works
            </Link>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">Connect a Page in minutes.</p>
          <p className="sr-only">{supportLine}</p>
        </div>

        <div className="relative isolate flex min-w-0 justify-center lg:justify-end">
          <GhostTiles />
          <PlatformTile />
        </div>
      </div>
    </section>
  )
}
