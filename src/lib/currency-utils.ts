export const SUPPORTED_CURRENCIES = [
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "QAR", symbol: "﷼", name: "Qatari Riyal" },
  { code: "OMR", symbol: "﷼", name: "Omani Rial" },
  { code: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar" },
  { code: "CAD", symbol: "$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "$", name: "Australian Dollar" },
] as const

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"]

export function getCurrencySymbol(currencyCode: string): string {
  const currency = SUPPORTED_CURRENCIES.find((item) => item.code === currencyCode)
  return currency?.symbol || currencyCode
}

export function getCurrencyInfo(currencyCode: string) {
  return SUPPORTED_CURRENCIES.find((item) => item.code === currencyCode)
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currencyCode: string = "USD",
  options?: {
    showSymbol?: boolean
    showCode?: boolean
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  }
): string {
  if (amount === null || amount === undefined) {
    return "-"
  }

  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount

  if (isNaN(numericAmount)) {
    return "-"
  }

  const {
    showSymbol = true,
    showCode = false,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options || {}

  const formatted = new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numericAmount)

  const currencyInfo = getCurrencyInfo(currencyCode)
  const symbol = currencyInfo?.symbol || currencyCode

  let result = ""
  if (showSymbol) {
    result += symbol
  }
  result += formatted
  if (showCode) {
    result += ` ${currencyCode}`
  }

  return result
}

export function parseCurrencyAmount(value: string): number {
  const cleaned = value.replace(/[^0-9.-]+/g, "")
  return parseFloat(cleaned) || 0
}

export function isValidCurrency(currency: string): currency is CurrencyCode {
  return SUPPORTED_CURRENCIES.some((item) => item.code === currency)
}

export function validatePaymentCurrency(
  invoiceCurrency: string,
  paymentCurrency: string
): boolean {
  return invoiceCurrency === paymentCurrency
}
