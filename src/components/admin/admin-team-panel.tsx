"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { CheckCircle2, Clipboard, Loader2, ShieldCheck, UserPlus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type AdminPermissionType = "full_admin" | "limited_admin"

type AdminTeamMember = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  adminPermissionType: AdminPermissionType | null
  isActive: boolean
  isAcademyOwner: boolean
  createdAt: string
}

type AdminTeamPanelProps = {
  initialAdmins: AdminTeamMember[]
  currentUserId: string
  canManageAdmins: boolean
  canChangePermissionType: boolean
}

const createAdminSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Please enter a valid email address"),
  phone: z.string().trim().optional(),
  adminPermissionType: z.enum(["full_admin", "limited_admin"]),
})

type CreateAdminValues = z.infer<typeof createAdminSchema>

const defaultAdminValues: CreateAdminValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  adminPermissionType: "limited_admin",
}

function getAdminTypeLabel(admin: AdminTeamMember) {
  if (admin.isAcademyOwner) {
    return "Academy Owner"
  }

  if (admin.adminPermissionType === "limited_admin") {
    return "Limited Admin"
  }

  return "Full Admin"
}

function getAdminTypeBadgeVariant(admin: AdminTeamMember) {
  if (admin.isAcademyOwner) {
    return "default" as const
  }

  if (admin.adminPermissionType === "limited_admin") {
    return "secondary" as const
  }

  return "success" as const
}

function formatCreatedDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function sortAdmins(admins: AdminTeamMember[]) {
  return [...admins].sort((left, right) => {
    if (left.isAcademyOwner !== right.isAcademyOwner) {
      return left.isAcademyOwner ? -1 : 1
    }

    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  })
}

export function AdminTeamPanel({
  initialAdmins,
  currentUserId,
  canManageAdmins,
  canChangePermissionType,
}: AdminTeamPanelProps) {
  const router = useRouter()
  const [admins, setAdmins] = useState(() => sortAdmins(initialAdmins))
  const [showForm, setShowForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [updatingAdminId, setUpdatingAdminId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState<{
    email: string
    password: string
  } | null>(null)

  const form = useForm<CreateAdminValues>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: defaultAdminValues,
  })

  async function createAdmin(values: CreateAdminValues) {
    setIsCreating(true)
    setError(null)
    setSuccess(null)
    setTemporaryPassword(null)

    try {
      const response = await fetch("/api/admin/admin-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add admin")
      }

      setAdmins((current) => sortAdmins([...current, data.admin]))
      setTemporaryPassword({
        email: data.admin.email,
        password: data.temporaryPassword,
      })
      setSuccess("New admin added successfully.")
      setShowForm(false)
      form.reset(defaultAdminValues)
      router.refresh()
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to add admin"
      )
    } finally {
      setIsCreating(false)
    }
  }

  async function updateAdmin(
    adminId: string,
    payload: Partial<Pick<AdminTeamMember, "isActive" | "adminPermissionType">>
  ) {
    setUpdatingAdminId(adminId)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/admin-team/${adminId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update admin")
      }

      setAdmins((current) =>
        sortAdmins(
          current.map((admin) =>
            admin.id === adminId ? { ...admin, ...data.admin } : admin
          )
        )
      )
      setSuccess("Admin team updated successfully.")
      router.refresh()
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update admin"
      )
    } finally {
      setUpdatingAdminId(null)
    }
  }

  async function copyTemporaryPassword() {
    if (!temporaryPassword || typeof navigator === "undefined") {
      return
    }

    await navigator.clipboard.writeText(temporaryPassword.password)
    setSuccess("Temporary password copied.")
  }

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Admin Team
          </CardTitle>
          <CardDescription>
            Add and manage admins who can access this academy. Admins are linked
            to this academy only.
          </CardDescription>
        </div>
        {canManageAdmins ? (
          <Button
            type="button"
            onClick={() => {
              setShowForm((current) => !current)
              setError(null)
              setSuccess(null)
            }}
            className="w-full sm:w-auto"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {showForm ? "Close Form" : "Add New Admin"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {!canManageAdmins ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Only the academy owner or a full admin can add or manage admin
            accounts.
          </div>
        ) : null}

        {temporaryPassword ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Temporary login password</p>
                <p className="mt-1 break-words">
                  Share this one-time password with {temporaryPassword.email}:
                </p>
                <code className="mt-2 inline-block rounded bg-white px-2 py-1 font-mono text-sm">
                  {temporaryPassword.password}
                </code>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyTemporaryPassword}
                className="bg-white"
              >
                <Clipboard className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>
        ) : null}

        {showForm && canManageAdmins ? (
          <div className="rounded-xl border bg-muted/10 p-4 sm:p-5">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(createAdmin)}
                className="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First name</FormLabel>
                        <FormControl>
                          <Input disabled={isCreating} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last name</FormLabel>
                        <FormControl>
                          <Input disabled={isCreating} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" disabled={isCreating} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone optional</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+92 300 1234567"
                            disabled={isCreating}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="adminPermissionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin permission type</FormLabel>
                      <Select
                        disabled={isCreating}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select admin type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="full_admin">Full Admin</SelectItem>
                          <SelectItem value="limited_admin">
                            Limited Admin
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Full admins can add/deactivate admins. Only the academy
                        owner can change permission type later.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="mr-2 h-4 w-4" />
                    )}
                    Add Admin
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        ) : null}

        {admins.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No admins found for this academy yet.
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role/Admin type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => (
                    <AdminTableRow
                      key={admin.id}
                      admin={admin}
                      currentUserId={currentUserId}
                      canManageAdmins={canManageAdmins}
                      canChangePermissionType={canChangePermissionType}
                      isUpdating={updatingAdminId === admin.id}
                      onUpdate={updateAdmin}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 md:hidden">
              {admins.map((admin) => (
                <AdminMobileCard
                  key={admin.id}
                  admin={admin}
                  currentUserId={currentUserId}
                  canManageAdmins={canManageAdmins}
                  canChangePermissionType={canChangePermissionType}
                  isUpdating={updatingAdminId === admin.id}
                  onUpdate={updateAdmin}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function AdminStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? "success" : "secondary"}>
      {isActive ? "Active" : "Inactive"}
    </Badge>
  )
}

function AdminTypeBadge({ admin }: { admin: AdminTeamMember }) {
  return (
    <Badge variant={getAdminTypeBadgeVariant(admin)}>
      {getAdminTypeLabel(admin)}
    </Badge>
  )
}

function AdminActions({
  admin,
  currentUserId,
  canManageAdmins,
  canChangePermissionType,
  isUpdating,
  onUpdate,
}: {
  admin: AdminTeamMember
  currentUserId: string
  canManageAdmins: boolean
  canChangePermissionType: boolean
  isUpdating: boolean
  onUpdate: (
    adminId: string,
    payload: Partial<Pick<AdminTeamMember, "isActive" | "adminPermissionType">>
  ) => Promise<void>
}) {
  const isSelf = admin.id === currentUserId
  const canToggleActive = canManageAdmins && !admin.isAcademyOwner && !isSelf
  const canEditPermission =
    canChangePermissionType && !admin.isAcademyOwner && !isUpdating

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      <Select
        value={admin.adminPermissionType || "full_admin"}
        disabled={!canEditPermission}
        onValueChange={(value) =>
          onUpdate(admin.id, {
            adminPermissionType: value as AdminPermissionType,
          })
        }
      >
        <SelectTrigger className="h-9 w-full sm:w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="full_admin">Full Admin</SelectItem>
          <SelectItem value="limited_admin">Limited Admin</SelectItem>
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant={admin.isActive ? "outline" : "default"}
        size="sm"
        disabled={!canToggleActive || isUpdating}
        onClick={() => onUpdate(admin.id, { isActive: !admin.isActive })}
      >
        {isUpdating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        {admin.isActive ? "Deactivate" : "Activate"}
      </Button>
    </div>
  )
}

function AdminTableRow({
  admin,
  currentUserId,
  canManageAdmins,
  canChangePermissionType,
  isUpdating,
  onUpdate,
}: {
  admin: AdminTeamMember
  currentUserId: string
  canManageAdmins: boolean
  canChangePermissionType: boolean
  isUpdating: boolean
  onUpdate: (
    adminId: string,
    payload: Partial<Pick<AdminTeamMember, "isActive" | "adminPermissionType">>
  ) => Promise<void>
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">
          {admin.firstName} {admin.lastName}
        </div>
        {admin.id === currentUserId ? (
          <p className="text-xs text-muted-foreground">You</p>
        ) : null}
      </TableCell>
      <TableCell className="max-w-[240px] break-all text-muted-foreground">
        {admin.email}
      </TableCell>
      <TableCell>
        <AdminTypeBadge admin={admin} />
      </TableCell>
      <TableCell>
        <AdminStatusBadge isActive={admin.isActive} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatCreatedDate(admin.createdAt)}
      </TableCell>
      <TableCell className="text-right">
        <AdminActions
          admin={admin}
          currentUserId={currentUserId}
          canManageAdmins={canManageAdmins}
          canChangePermissionType={canChangePermissionType}
          isUpdating={isUpdating}
          onUpdate={onUpdate}
        />
      </TableCell>
    </TableRow>
  )
}

function AdminMobileCard({
  admin,
  currentUserId,
  canManageAdmins,
  canChangePermissionType,
  isUpdating,
  onUpdate,
}: {
  admin: AdminTeamMember
  currentUserId: string
  canManageAdmins: boolean
  canChangePermissionType: boolean
  isUpdating: boolean
  onUpdate: (
    adminId: string,
    payload: Partial<Pick<AdminTeamMember, "isActive" | "adminPermissionType">>
  ) => Promise<void>
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-medium">
            {admin.firstName} {admin.lastName}
          </p>
          <p className="break-all text-sm text-muted-foreground">{admin.email}</p>
          {admin.phone ? (
            <p className="mt-1 text-sm text-muted-foreground">{admin.phone}</p>
          ) : null}
        </div>
        <AdminStatusBadge isActive={admin.isActive} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <AdminTypeBadge admin={admin} />
        {admin.id === currentUserId ? <Badge variant="outline">You</Badge> : null}
        <Badge variant="outline">{formatCreatedDate(admin.createdAt)}</Badge>
      </div>
      <div className="mt-4">
        <AdminActions
          admin={admin}
          currentUserId={currentUserId}
          canManageAdmins={canManageAdmins}
          canChangePermissionType={canChangePermissionType}
          isUpdating={isUpdating}
          onUpdate={onUpdate}
        />
      </div>
    </div>
  )
}
