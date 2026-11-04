"use client"

import { useEffect } from "react"

export default function BillingPage() {
  useEffect(() => {
    window.location.replace("/settings?tab=billing")
  }, [])

  return <main className="min-h-[70vh] px-5 py-12" role="status">Redirecting to billing settings...</main>
}