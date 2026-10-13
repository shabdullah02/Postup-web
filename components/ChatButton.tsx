"use client"

import { MessageCircle } from "lucide-react"

export default function ChatButton() {
  return (
    <button
      type="button"
      aria-label="Open chat"
      className="fixed bottom-36 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-colors duration-150 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary-text)] lg:bottom-6"
    >
      <MessageCircle className="size-6" aria-hidden="true" />
    </button>
  )
}
