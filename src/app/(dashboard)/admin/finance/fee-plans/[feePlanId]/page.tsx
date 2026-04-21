import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  ArrowLeft,
  Pencil,
  DollarSign,
  Calendar,
  Repeat,
  AlertCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CurrencyAmount } from "@/components/ui/currency-amount"

interface FeePlanDetailPageProps {
  params: {
    feePlanId: string
  }
}

async function fetchFeePlan(feePlanId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    return null
  }

  const feePlan = await prisma.feePlan.findUnique({
    where: { id: feePlanId },
    include: {
      classAssignments: {
        include: {
          class: {
            include: {
              course: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          effectiveFrom: "desc",
        },
      },
      _count: {
        select: {
          invoices: true,
        },
      },
    },
  })

  if (!feePlan || feePlan.academyId !== session.user.academyId) {
    return null
  }

  return feePlan
}

const frequencyLabels: Record<string, string> = {
  one_time: "One Time",
  monthly: "Monthly",
  term: "Term (3 months)",
  yearly: "Yearly",
}

export async function generateMetadata({
  params,
}: FeePlanDetailPageProps): Promise<Metadata> {
  const feePlan = await fetchFeePlan(params.feePlanId)

  if (!feePlan) {
    return { title: "Fee Plan Not Found" }
  }

  return {
    title: `${feePlan.name} - Fee Plans - AcademyFlow`,
  }
}

export default async function FeePlanDetailPage({
  params,
}: FeePlanDetailPageProps) {
  const feePlan = await fetchFeePlan(params.feePlanId)

  if (!feePlan) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/finance/fee-plans">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{feePlan.name}</h2>
              <Badge variant={feePlan.isActive ? "success" : "secondary"}>
                {feePlan.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Fee plan details and assignments
            </p>
          </div>
        </div>
        <Link href={`/admin/finance/fee-plans/${params.feePlanId}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Fee Plan
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Fee Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Base Amount
                </p>
                <p className="text-3xl font-bold">
                  <CurrencyAmount
                    amount={Number(feePlan.amount)}
                    currency={feePlan.currency}
                  />
                </p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    <Repeat className="h-4 w-4" />
                    Frequency
                  </p>
                  <p>{frequencyLabels[feePlan.frequency] || feePlan.frequency}</p>
                </div>
                {feePlan.frequency === "monthly" && feePlan.dueDayOfMonth && (
                  <div>
                    <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Due Day
                    </p>
                    <p>Day {feePlan.dueDayOfMonth} of month</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Late Fee Settings</CardTitle>
            </CardHeader>
            <CardContent>
              {feePlan.lateFeeType && feePlan.lateFeeAmount ? (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {feePlan.lateFeeType === "fixed" ? "Fixed Amount" : "Percentage"}
                  </p>
                  <p className="text-2xl font-semibold text-yellow-600">
                    {feePlan.lateFeeType === "fixed" ? (
                      <CurrencyAmount
                        amount={Number(feePlan.lateFeeAmount)}
                        currency={feePlan.currency}
                      />
                    ) : (
                      `${feePlan.lateFeeAmount}%`
                    )}
                  </p>
                  {feePlan.lateFeeType === "percentage" && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Calculated as {Number(feePlan.lateFeeAmount)}% of base amount
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>No late fee configured</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Classes Assigned
                </span>
                <Badge variant="outline">{feePlan.classAssignments.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Invoices</span>
                <Badge variant="outline">{feePlan._count.invoices}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {feePlan.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {feePlan.description}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Class Assignments</CardTitle>
              <CardDescription>Classes using this fee plan</CardDescription>
            </CardHeader>
            <CardContent>
              {feePlan.classAssignments.length === 0 ? (
                <div className="py-8 text-center">
                  <DollarSign className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Not assigned to any classes
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {feePlan.classAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{assignment.class.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.class.course.code} - {assignment.class.course.name}
                        </p>
                        {assignment.customAmount && (
                          <Badge variant="outline" className="mt-1">
                            Custom:{" "}
                            <CurrencyAmount
                              amount={Number(assignment.customAmount)}
                              currency={feePlan.currency}
                            />
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          Effective from{" "}
                          {new Date(assignment.effectiveFrom).toLocaleDateString()}
                        </p>
                        {assignment.effectiveUntil && (
                          <p className="text-xs text-muted-foreground">
                            Until {new Date(assignment.effectiveUntil).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
