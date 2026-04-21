"use client"

import { formatCurrency } from "@/lib/currency-utils"
import { cn } from "@/lib/utils"

interface CurrencyAmountProps {
  amount: number | string | null | undefined
  currency: string
  showSymbol?: boolean
  showCode?: boolean
  className?: string
  negativeClassName?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

export function CurrencyAmount({
  amount,
  currency,
  showSymbol = true,
  showCode = false,
  className,
  negativeClassName,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
}: CurrencyAmountProps) {
  if (amount === null || amount === undefined) {
    return <span className={cn("text-muted-foreground", className)}>-</span>
  }

  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount

  if (isNaN(numericAmount)) {
    return <span className={cn("text-muted-foreground", className)}>-</span>
  }

  const isNegative = numericAmount < 0
  const formatted = formatCurrency(Math.abs(numericAmount), currency, {
    showSymbol,
    showCode,
    minimumFractionDigits,
    maximumFractionDigits,
  })

  return (
    <span
      className={cn(
        className,
        isNegative && cn("text-destructive", negativeClassName)
      )}
    >
      {isNegative ? "-" : ""}
      {formatted}
    </span>
  )
}
