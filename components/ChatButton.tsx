"use client"

import { MessageCircle } from "lucide-react"

export default function ChatButton() {
  return (
    <button
      type="button"
      aria-label="Open chat"
      className="fixed bottom-36 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors duration-150 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring lg:bottom-6"
    >
      <MessageCircle className="size-6" aria-hidden="true" />
    </button>
  )
}
