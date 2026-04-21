"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Search, DollarSign } from "lucide-react"

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
import { FeePlansTable } from "@/components/admin/finance/fee-plans-table"
import { Skeleton } from "@/components/ui/skeleton"
import { SUPPORTED_CURRENCIES } from "@/lib/currency-utils"

const frequencies = [
  { value: "all", label: "All Frequencies" },
  { value: "one_time", label: "One Time" },
  { value: "monthly", label: "Monthly" },
  { value: "term", label: "Term" },
  { value: "yearly", label: "Yearly" },
]

export default function FeePlansPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [feePlans, setFeePlans] = useState([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [frequencyFilter, setFrequencyFilter] = useState(
    searchParams.get("frequency") || ""
  )
  const [currencyFilter, setCurrencyFilter] = useState(
    searchParams.get("currency") || ""
  )
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("isActive") || ""
  )

  const page = parseInt(searchParams.get("page") || "1")
  const limit = 10

  useEffect(() => {
    fetchFeePlans()
  }, [page, searchParams])

  const fetchFeePlans = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      const search = searchParams.get("search")
      const frequency = searchParams.get("frequency")
      const currency = searchParams.get("currency")
      const isActive = searchParams.get("isActive")

      if (search) params.set("search", search)
      if (frequency && frequency !== "all") params.set("frequency", frequency)
      if (currency && currency !== "all") params.set("currency", currency)
      if (isActive && isActive !== "all") params.set("isActive", isActive)
      params.set("page", page.toString())
      params.set("limit", limit.toString())

      const response = await fetch(`/api/admin/finance/fee-plans?${params.toString()}`)
      const data = await response.json()
      setFeePlans(data.feePlans)
      setTotal(data.total)
    } catch (error) {
      console.error("Failed to fetch fee plans:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchQuery) params.set("search", searchQuery)
    if (frequencyFilter && frequencyFilter !== "all") {
      params.set("frequency", frequencyFilter)
    }
    if (currencyFilter && currencyFilter !== "all") {
      params.set("currency", currencyFilter)
    }
    if (statusFilter && statusFilter !== "all") {
      params.set("isActive", statusFilter)
    }
    params.set("page", "1")
    router.push(`/admin/finance/fee-plans?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setFrequencyFilter("")
    setCurrencyFilter("")
    setStatusFilter("")
    router.push("/admin/finance/fee-plans")
  }

  const hasActiveFilters =
    searchParams.get("search") ||
    searchParams.get("frequency") ||
    searchParams.get("currency") ||
    searchParams.get("isActive")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fee Plans</h2>
          <p className="text-muted-foreground">
            Manage fee structures and billing templates
          </p>
        </div>
        <Link href="/admin/finance/fee-plans/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Fee Plan
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Fee Plans</CardTitle>
          <CardDescription>
            Search and filter through fee plans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Frequency" />
              </SelectTrigger>
              <SelectContent>
                {frequencies.map((freq) => (
                  <SelectItem key={freq.value} value={freq.value}>
                    {freq.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">Apply Filters</Button>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            All Fee Plans
          </CardTitle>
          <CardDescription>
            {total} fee plan{total !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <FeePlansTable
              feePlans={feePlans}
              total={total}
              page={page}
              limit={limit}
              onPageChange={(newPage) => {
                const params = new URLSearchParams(searchParams.toString())
                params.set("page", newPage.toString())
                router.push(`/admin/finance/fee-plans?${params.toString()}`)
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
