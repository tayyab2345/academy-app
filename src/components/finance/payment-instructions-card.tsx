import { Building2, Landmark, Smartphone } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface PaymentInstructionsCardProps {
  settings: {
    jazzCashNumber: string | null
    easyPaisaNumber: string | null
    bankName: string | null
    bankAccountTitle: string | null
    bankAccountNumber: string | null
    iban: string | null
    paymentInstructions: string | null
  } | null
}

export function PaymentInstructionsCard({
  settings,
}: PaymentInstructionsCardProps) {
  const hasAnyPaymentMethod =
    settings?.jazzCashNumber ||
    settings?.easyPaisaNumber ||
    settings?.bankAccountNumber ||
    settings?.iban

  if (!settings || !hasAnyPaymentMethod) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Instructions</CardTitle>
          <CardDescription>
            Manual payment instructions have not been configured yet. Please
            contact the academy before sending payment.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Instructions</CardTitle>
        <CardDescription>
          Use one of the academy&apos;s approved payment methods below, then upload
          your receipt for review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings.jazzCashNumber && (
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">JazzCash</p>
              <p className="text-sm text-muted-foreground">
                Send payment to{" "}
                <span className="font-mono">{settings.jazzCashNumber}</span>
              </p>
            </div>
          </div>
        )}

        {settings.easyPaisaNumber && (
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Easypaisa</p>
              <p className="text-sm text-muted-foreground">
                Send payment to{" "}
                <span className="font-mono">{settings.easyPaisaNumber}</span>
              </p>
            </div>
          </div>
        )}

        {(settings.bankAccountNumber || settings.iban) && (
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">Bank Transfer</p>
              {settings.bankName && (
                <p className="text-sm text-muted-foreground">
                  <Landmark className="mr-1 inline h-3.5 w-3.5" />
                  {settings.bankName}
                </p>
              )}
              {settings.bankAccountTitle && (
                <p className="text-sm text-muted-foreground">
                  Account Title: {settings.bankAccountTitle}
                </p>
              )}
              {settings.bankAccountNumber && (
                <p className="text-sm text-muted-foreground">
                  Account Number:{" "}
                  <span className="font-mono">{settings.bankAccountNumber}</span>
                </p>
              )}
              {settings.iban && (
                <p className="text-sm text-muted-foreground">
                  IBAN: <span className="font-mono">{settings.iban}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {settings.paymentInstructions && (
          <>
            <Separator />
            <div>
              <p className="mb-2 text-sm font-medium">Additional Instructions</p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {settings.paymentInstructions}
              </p>
            </div>
          </>
        )}

        <Separator />

        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <span className="font-medium">Important:</span> After you make the
          payment, submit the proof below so the academy can review and record it
          officially.
        </div>
      </CardContent>
    </Card>
  )
}
