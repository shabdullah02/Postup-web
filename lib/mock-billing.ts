export type MockCardFields = {
  cardNumber: string
  expiry: string
  cvv: string
  name: string
}

export type MockCardField = keyof MockCardFields
export type MockCardErrors = Partial<Record<MockCardField, string>>

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 19)
  return digits.match(/.{1,4}/g)?.join(" ") ?? ""
}

export function formatCardExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

export function cardBrand(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, "")
  if (digits.startsWith("4")) return "Visa"
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard"
  if (/^(34|37)/.test(digits)) return "American Express"
  if (/^(6011|65|64[4-9])/.test(digits)) return "Discover"
  return "Card"
}

function isValidCardNumber(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, "")
  if (digits.length < 12 || digits.length > 19) return false

  let sum = 0
  let doubleDigit = false
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index])
    if (doubleDigit) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    doubleDigit = !doubleDigit
  }
  return sum % 10 === 0
}

export function validateMockCard(fields: MockCardFields, now = new Date()): MockCardErrors {
  const errors: MockCardErrors = {}
  const digits = fields.cardNumber.replace(/\D/g, "")
  if (!isValidCardNumber(digits)) errors.cardNumber = "Enter a valid card number."

  const expiry = fields.expiry.match(/^(\d{2})\/(\d{2})$/)
  if (!expiry) {
    errors.expiry = "Enter expiry as MM/YY."
  } else {
    const month = Number(expiry[1])
    const year = 2000 + Number(expiry[2])
    if (month < 1 || month > 12) {
      errors.expiry = "Enter a valid expiry month."
    } else if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
      errors.expiry = "This card has expired."
    }
  }

  const expectedCvvLength = cardBrand(digits) === "American Express" ? 4 : 3
  if (!new RegExp(`^\\d{${expectedCvvLength}}$`).test(fields.cvv)) {
    errors.cvv = `Enter a ${expectedCvvLength}-digit security code.`
  }
  if (!fields.name.trim()) errors.name = "Enter the name on the card."
  return errors
}
