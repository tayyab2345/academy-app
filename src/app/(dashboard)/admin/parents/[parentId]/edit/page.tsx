import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ParentForm } from "@/components/admin/parents/parent-form"

interface EditParentPageProps {
  params: {
    parentId: string
  }
}

async function fetchParent(parentId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "admin") {
    return null
  }

  const parent = await prisma.parentProfile.findUnique({
    where: { id: parentId },
    include: {
      user: {
        select: {
          id: true,
          academyId: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
        },
      },
    },
  })

  if (!parent || parent.user.academyId !== session.user.academyId) {
    return null
  }

  return parent
}

export async function generateMetadata({
  params,
}: EditParentPageProps): Promise<Metadata> {
  const parent = await fetchParent(params.parentId)

  if (!parent) {
    return { title: "Parent Not Found" }
  }

  return {
    title: `Edit ${parent.user.firstName} ${parent.user.lastName} - Parents - AcademyFlow`,
  }
}

export default async function EditParentPage({
  params,
}: EditParentPageProps) {
  const parent = await fetchParent(params.parentId)

  if (!parent) {
    notFound()
  }

  const initialData = {
    id: parent.id,
    firstName: parent.user.firstName,
    lastName: parent.user.lastName,
    email: parent.user.email,
    phone: parent.user.phone || "",
    occupation: parent.occupation || "",
    preferredContactMethod: parent.preferredContactMethod,
    isPrimaryContact: parent.isPrimaryContact,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/parents/${params.parentId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit Parent</h2>
          <p className="text-muted-foreground">
            Update parent information for {parent.user.firstName}{" "}
            {parent.user.lastName}
          </p>
        </div>
      </div>

      <ParentForm initialData={initialData} isEditing />
    </div>
  )
}
