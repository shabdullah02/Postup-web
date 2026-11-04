"use client"

import { useState, type FormEvent } from "react"
import { ApiError, billingApi } from "@/lib/api"
import type { Plan } from "@/lib/api-types"
import {
  formatCardExpiry,
  formatCardNumber,
  validateMockCard,
  type MockCardField,
  type MockCardFields,
} from "@/lib/mock-billing"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const emptyFields: MockCardFields = { cardNumber: "", expiry: "", cvv: "", name: "" }

export default function MockBillingForm({
  plan,
  onSubscribed,
}: {
  plan: Exclude<Plan, "free">
  onSubscribed: () => Promise<void>
}) {
  const [fields, setFields] = useState<MockCardFields>(emptyFields)
  const [touched, setTouched] = useState<Partial<Record<MockCardField, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const validationErrors = validateMockCard(fields)

  function updateField(field: MockCardField, value: string) {
    setFields((current) => ({ ...current, [field]: value }))
    setTouched((current) => ({ ...current, [field]: true }))
    setError("")
    setSuccess("")
  }

  function fieldError(field: MockCardField): string | undefined {
    return submitted || touched[field] ? validationErrors[field] : undefined
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    setError("")
    setSuccess("")
    if (Object.keys(validationErrors).length > 0) return

    const digits = fields.cardNumber.replace(/\D/g, "")
    const [monthText, yearText] = fields.expiry.split("/")
    const request = {
      plan,
      card_number: digits,
      exp_month: Number(monthText),
      exp_year: 2000 + Number(yearText),
      cvv: fields.cvv,
    }
    setFields(emptyFields)
    setTouched({})
    setSubmitted(false)
    setIsSubmitting(true)
    let subscriptionCreated = false
    try {
      await billingApi.mockSubscribe(request)
      subscriptionCreated = true
      setSuccess(`Your ${plan} plan has been updated.`)
      await onSubscribed()
    } catch (requestError) {
      setSuccess("")
      setError(subscriptionCreated
        ? "Your plan was updated, but billing details could not be refreshed. Please reload the page."
        : requestError instanceof ApiError && requestError.status < 500
          ? requestError.message
          : "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const cardNumberError = fieldError("cardNumber")
  const expiryError = fieldError("expiry")
  const cvvError = fieldError("cvv")
  const nameError = fieldError("name")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a payment method</CardTitle>
        <CardDescription>Add a card for the {plan} plan.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="max-w-lg space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <label htmlFor="mock-card-number" className="text-sm font-medium">Card number</label>
            <Input
              id="mock-card-number"
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              value={fields.cardNumber}
              onChange={(event) => updateField("cardNumber", formatCardNumber(event.target.value))}
              aria-invalid={Boolean(cardNumberError)}
              aria-describedby={cardNumberError ? "mock-card-number-error" : undefined}
              maxLength={23}
              required
            />
            {cardNumberError ? <p id="mock-card-number-error" className="text-sm text-destructive">{cardNumberError}</p> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="mock-card-expiry" className="text-sm font-medium">Expiry (MM/YY)</label>
              <Input
                id="mock-card-expiry"
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                value={fields.expiry}
                onChange={(event) => updateField("expiry", formatCardExpiry(event.target.value))}
                aria-invalid={Boolean(expiryError)}
                aria-describedby={expiryError ? "mock-card-expiry-error" : undefined}
                maxLength={5}
                required
              />
              {expiryError ? <p id="mock-card-expiry-error" className="text-sm text-destructive">{expiryError}</p> : null}
            </div>
            <div className="space-y-2">
              <label htmlFor="mock-card-cvv" className="text-sm font-medium">CVV</label>
              <Input
                id="mock-card-cvv"
                type="text"
                inputMode="numeric"
                autoComplete="cc-csc"
                value={fields.cvv}
                onChange={(event) => updateField("cvv", event.target.value.replace(/\D/g, "").slice(0, 4))}
                aria-invalid={Boolean(cvvError)}
                aria-describedby={cvvError ? "mock-card-cvv-error" : undefined}
                maxLength={4}
                required
              />
              {cvvError ? <p id="mock-card-cvv-error" className="text-sm text-destructive">{cvvError}</p> : null}
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="mock-card-name" className="text-sm font-medium">Name on card</label>
            <Input
              id="mock-card-name"
              type="text"
              autoComplete="cc-name"
              value={fields.name}
              onChange={(event) => updateField("name", event.target.value)}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? "mock-card-name-error" : undefined}
              required
            />
            {nameError ? <p id="mock-card-name-error" className="text-sm text-destructive">{nameError}</p> : null}
          </div>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          {success ? <p role="status" className="text-sm text-green-700 dark:text-green-400">{success}</p> : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Upgrade"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
