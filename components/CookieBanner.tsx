"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { Fingerprint, X } from "lucide-react"
import { content } from "@/lib/content"

const consentKey = "cookie-consent"
const consentChangedEvent = "cookie-consent-changed"
let acceptedInMemory = false

function subscribeToConsent(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener(consentChangedEvent, callback)

  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(consentChangedEvent, callback)
  }
}

function getConsentSnapshot() {
  if (acceptedInMemory) return false

  try {
    return localStorage.getItem(consentKey) !== "accepted"
  } catch {
    return true
  }
}

export default function CookieBanner() {
  const visible = useSyncExternalStore(subscribeToConsent, getConsentSnapshot, () => false)

  function allowCookies() {
    try {
      localStorage.setItem(consentKey, "accepted")
    } catch {
      acceptedInMemory = true
    }
    acceptedInMemory = true
    window.dispatchEvent(new Event(consentChangedEvent))
  }

  if (!visible) return null

  return (
    <aside aria-label="Cookie notice" className="fixed bottom-5 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[60rem] -translate-x-1/2 flex-wrap items-center gap-4 rounded-[6px] border border-[var(--border-color)] bg-[var(--cookie-background)] px-4 py-3 sm:flex-nowrap sm:px-5">
      <Fingerprint className="hidden size-6 shrink-0 text-[var(--secondary-text)] sm:block" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm leading-5 text-[var(--secondary-text)]">
        {content.cookieText}{" "}<Link href="/privacy" className="text-[var(--accent)] underline underline-offset-2 transition-opacity duration-150 hover:opacity-80">{content.privacyLink}</Link>
      </p>
      <button type="button" onClick={allowCookies} className="rounded-[4px] border border-[var(--border-color)] px-3 py-2 text-sm font-medium text-[var(--primary-text)] transition-colors duration-150 hover:bg-[var(--surface)]">
        {content.cookieButton}
      </button>
      <button type="button" onClick={allowCookies} aria-label="Dismiss cookie notice" className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-[4px] text-[var(--secondary-text)] transition-colors duration-150 hover:bg-[var(--surface)] sm:static sm:size-8">
        <X className="size-4" aria-hidden="true" />
      </button>
    </aside>
  )
}