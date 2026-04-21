"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search, FileText } from "lucide-react"
import type { AdminInvoiceListItem } from "@/lib/admin/admin-data"
import { SUPPORTED_CURRENCIES } from "@/lib/currency-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { InvoicesTable } from "@/components/admin/finance/invoices-table"

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "waived", label: "Waived" },
]

interface InvoicesPageContentProps {
  invoices: AdminInvoiceListItem[]
  total: number
  page: number
  limit: number
  appliedSearch: string
  appliedStatusFilter: string
  appliedCurrencyFilter: string
}

export function InvoicesPageContent({
  invoices,
  total,
  page,
  limit,
  appliedSearch,
  appliedStatusFilter,
  appliedCurrencyFilter,
}: InvoicesPageContentProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState(appliedSearch)
  const [statusFilter, setStatusFilter] = useState(appliedStatusFilter)
  const [currencyFilter, setCurrencyFilter] = useState(appliedCurrencyFilter)

  const hasActiveFilters =
    Boolean(appliedSearch) ||
    Boolean(appliedStatusFilter) ||
    Boolean(appliedCurrencyFilter)

  const pushWithFilters = (nextPage: number) => {
    const params = new URLSearchParams()

    if (appliedSearch) {
      params.set("search", appliedSearch)
    }
    if (appliedStatusFilter) {
      params.set("status", appliedStatusFilter)
    }
    if (appliedCurrencyFilter) {
      params.set("currency", appliedCurrencyFilter)
    }
    params.set("page", nextPage.toString())
    params.set("limit", limit.toString())

    router.push(`/admin/finance/invoices?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">Manage and track all invoices</p>
        </div>
        <Link href="/admin/finance/invoices/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Invoices</CardTitle>
          <CardDescription>Search and filter through invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault()

              const params = new URLSearchParams()
              if (searchQuery) {
                params.set("search", searchQuery)
              }
              if (statusFilter && statusFilter !== "all") {
                params.set("status", statusFilter)
              }
              if (currencyFilter && currencyFilter !== "all") {
                params.set("currency", currencyFilter)
              }
              params.set("page", "1")
              params.set("limit", limit.toString())

              router.push(`/admin/finance/invoices?${params.toString()}`)
            }}
            className="flex flex-wrap gap-3"
          >
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by invoice #, student, or description..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter || "all"} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={currencyFilter || "all"}
              onValueChange={setCurrencyFilter}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Currencies</SelectItem>
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit">Apply Filters</Button>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearchQuery("")
                  setStatusFilter("")
                  setCurrencyFilter("")
                  router.push(`/admin/finance/invoices?limit=${limit}`)
                }}
              >
                Clear
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Invoices
          </CardTitle>
          <CardDescription>
            {total} invoice{total !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvoicesTable
            invoices={invoices}
            total={total}
            page={page}
            limit={limit}
            onPageChange={pushWithFilters}
          />
        </CardContent>
      </Card>
    </div>
  )
}
