"use client"

import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { platforms, type Platform } from "@/lib/platforms"
import { cn } from "@/lib/utils"
import styles from "./hero-tile.module.css"

const ROTATE_MS = 3500
const PILL_PAUSE_MS = 8000

const TOP_FACE = "M220 54 410 164 220 274 30 164Z"
const LEFT_FACE = "M30 164 220 274 220 318 30 208Z"
const RIGHT_FACE = "M220 274 410 164 410 208 220 318Z"

function TileFace({ platform }: { platform: Platform }) {
  return (
    <svg
      viewBox="0 0 440 340"
      className="block h-auto w-full"
      aria-hidden="true"
      focusable="false"
    >
      {platform.topGradient ? (
        <defs>
          <linearGradient id={`tile-top-${platform.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={platform.topGradient[0]} />
            <stop offset="55%" stopColor={platform.topGradient[1]} />
            <stop offset="100%" stopColor={platform.topGradient[2]} />
          </linearGradient>
        </defs>
      ) : null}

      <path d={LEFT_FACE} className={platform.leftFace} />
      <path d={RIGHT_FACE} className={platform.rightFace} />
      <path
        d={TOP_FACE}
        className={platform.topGradient ? undefined : platform.topFace}
        fill={platform.topGradient ? `url(#tile-top-${platform.id})` : undefined}
      />

      <g transform="translate(156 100)">
        <HugeiconsIcon
          icon={platform.icon}
          size={128}
          strokeWidth={1.4}
          className={platform.logo}
        />
      </g>
    </svg>
  )
}

export default function PlatformTile() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [hovering, setHovering] = useState(false)
  const [tabHidden, setTabHidden] = useState(false)
  const pillPausedRef = useRef(false)
  const pillPauseTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => window.clearTimeout(pillPauseTimerRef.current)
  }, [])

  useEffect(() => {
    function handleVisibilityChange() {
      setTabHidden(document.visibilityState === "hidden")
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [])

  useEffect(() => {
    if (hovering || tabHidden) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const timer = window.setInterval(() => {
      if (reducedMotion.matches || pillPausedRef.current) return
      setActiveIndex((index) => (index + 1) % platforms.length)
    }, ROTATE_MS)

    return () => window.clearInterval(timer)
  }, [hovering, tabHidden])

  function selectPlatform(index: number) {
    setActiveIndex(index)
    pillPausedRef.current = true
    window.clearTimeout(pillPauseTimerRef.current)
    pillPauseTimerRef.current = window.setTimeout(() => {
      pillPausedRef.current = false
    }, PILL_PAUSE_MS)
  }

  return (
    <div
      className="relative z-10 w-full max-w-[460px] lg:ml-auto"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="relative mx-auto aspect-[440/340] w-[78%] max-w-[440px] sm:w-[70%] lg:mx-0 lg:w-full">
        <div className={cn("absolute inset-0", styles.bob)}>
          <div
            className={cn(
              "absolute inset-0",
              activeIndex % 2 === 0 ? styles.liftA : styles.liftB,
            )}
          >
            {platforms.map((platform, index) => (
              <div
                key={platform.id}
                aria-hidden="true"
                className={cn(
                  "absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none",
                  index === activeIndex ? "opacity-100" : "opacity-0",
                )}
              >
                <TileFace platform={platform} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        role="group"
        aria-label="Platform preview"
        className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-end"
      >
        {platforms.map((platform, index) => {
          const active = index === activeIndex
          return (
            <button
              key={platform.id}
              type="button"
              aria-pressed={active}
              onClick={() => selectPlatform(index)}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <HugeiconsIcon
                icon={platform.icon}
                size={14}
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <span>{platform.name}</span>
              {platform.soon ? (
                <span className="border border-current px-1 py-px text-[9px] font-semibold uppercase leading-none tracking-wide">
                  Soon
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
