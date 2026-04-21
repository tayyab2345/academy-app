"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PayrollStatus } from "@prisma/client"
import { Search } from "lucide-react"
import { PayrollStaffOption } from "@/lib/payroll/payroll-data"
import {
  payrollRoleLabels,
  payrollStatusLabels,
} from "@/lib/payroll/payroll-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AdminPayrollFiltersProps {
  basePath: string
  limit: number
  staffOptions: PayrollStaffOption[]
  appliedRole: string
  appliedUserId: string
  appliedMonth: string
  appliedStatus: string
}

export function AdminPayrollFilters({
  basePath,
  limit,
  staffOptions,
  appliedRole,
  appliedUserId,
  appliedMonth,
  appliedStatus,
}: AdminPayrollFiltersProps) {
  const router = useRouter()
  const [role, setRole] = useState(appliedRole || "all")
  const [userId, setUserId] = useState(appliedUserId || "all")
  const [month, setMonth] = useState(appliedMonth || "")
  const [status, setStatus] = useState(appliedStatus || "all")

  function pushFilters(nextPage: number) {
    const params = new URLSearchParams()

    if (role !== "all") {
      params.set("role", role)
    }

    if (userId !== "all") {
      params.set("userId", userId)
    }

    if (month) {
      params.set("month", month)
    }

    if (status !== "all") {
      params.set("status", status)
    }

    params.set("page", nextPage.toString())
    params.set("limit", limit.toString())

    router.push(`${basePath}?${params.toString()}`)
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        pushFilters(1)
      }}
      className="flex flex-wrap gap-3 rounded-lg border p-4"
    >
      <Select value={role} onValueChange={setRole}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          <SelectItem value="teacher">{payrollRoleLabels.teacher}</SelectItem>
          <SelectItem value="admin">{payrollRoleLabels.admin}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={userId} onValueChange={setUserId}>
        <SelectTrigger className="min-w-[240px]">
          <SelectValue placeholder="Employee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Employees</SelectItem>
          {staffOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.firstName} {option.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {Object.values(PayrollStatus).map((statusValue) => (
            <SelectItem key={statusValue} value={statusValue}>
              {payrollStatusLabels[statusValue]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="submit">Apply Filters</Button>
      {(appliedRole || appliedUserId || appliedMonth || appliedStatus) && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setRole("all")
            setUserId("all")
            setMonth("")
            setStatus("all")
            router.push(`${basePath}?page=1&limit=${limit}`)
          }}
        >
          Clear
        </Button>
      )}
    </form>
  )
}

