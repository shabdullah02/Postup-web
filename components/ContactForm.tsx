"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { content } from "@/lib/content"

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const subject = encodeURIComponent(`Postup inquiry: ${values.get("subject")}`)
    const body = encodeURIComponent(`From: ${values.get("name")} (${values.get("email")})\n\n${values.get("message")}`)
    window.location.href = `mailto:${content.marketing.contactEmail}?subject=${subject}&body=${body}`
    setSubmitted(true)
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label htmlFor="contact-name" className="text-sm font-medium">Name</label>
        <Input id="contact-name" name="name" autoComplete="name" required />
      </div>
      <div className="space-y-2">
        <label htmlFor="contact-email" className="text-sm font-medium">Email</label>
        <Input id="contact-email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <label htmlFor="contact-subject" className="text-sm font-medium">Subject</label>
        <Input id="contact-subject" name="subject" required />
      </div>
      <div className="space-y-2">
        <label htmlFor="contact-message" className="text-sm font-medium">Message</label>
        <Textarea id="contact-message" name="message" rows={6} required />
      </div>
      <Button type="submit">Open email</Button>
      {submitted ? <p role="status" className="text-sm text-muted-foreground">Your email app should open with the message ready to send.</p> : null}
      <p className="text-xs text-muted-foreground">This form opens your email app; it does not send data to Postup from this page.</p>
    </form>
  )
}