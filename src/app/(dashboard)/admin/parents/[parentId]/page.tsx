import { Metadata } from "next"
import { revalidatePath } from "next/cache"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  Calendar,
  Users,
  Briefcase,
  Shield,
  Car,
  PhoneCall,
  Trash2,
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
import { LinkChildrenDialog } from "@/components/admin/parents/link-children-dialog"
import { UserAvatar } from "@/components/ui/user-avatar"

interface ParentDetailPageProps {
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
          avatarUrl: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      studentLinks: {
        include: {
          studentProfile: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: {
          isPrimaryForStudent: "desc",
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
}: ParentDetailPageProps): Promise<Metadata> {
  const parent = await fetchParent(params.parentId)

  if (!parent) {
    return { title: "Parent Not Found" }
  }

  return {
    title: `${parent.user.firstName} ${parent.user.lastName} - Parents - AcademyFlow`,
  }
}

export default async function ParentDetailPage({
  params,
}: ParentDetailPageProps) {
  const parent = await fetchParent(params.parentId)

  if (!parent) {
    notFound()
  }

  const existingStudentIds = parent.studentLinks.map(
    (link) => link.studentProfile.id
  )

  async function unlinkStudent(studentId: string) {
    "use server"

    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return
    }

    await prisma.parentStudentLink.delete({
      where: {
        parentProfileId_studentProfileId: {
          parentProfileId: params.parentId,
          studentProfileId: studentId,
        },
      },
    })

    revalidatePath(`/admin/parents/${params.parentId}`)
    revalidatePath(`/admin/students/${studentId}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/parents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Parent Profile
            </h2>
            <p className="text-muted-foreground">
              View parent details and linked children
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <LinkChildrenDialog
            parentId={params.parentId}
            existingStudentIds={existingStudentIds}
          />
          <Link href={`/admin/parents/${params.parentId}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Parent
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <UserAvatar
                  firstName={parent.user.firstName}
                  lastName={parent.user.lastName}
                  avatarUrl={parent.user.avatarUrl}
                  className="h-24 w-24"
                  fallbackClassName="bg-primary/10 text-2xl text-primary"
                  iconClassName="h-10 w-10"
                />
                <h3 className="mt-4 text-xl font-semibold">
                  {parent.user.firstName} {parent.user.lastName}
                </h3>
                <div className="mt-2 flex gap-2">
                  <Badge variant={parent.user.isActive ? "success" : "secondary"}>
                    {parent.user.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {parent.isPrimaryContact && (
                    <Badge variant="default">Primary Contact</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{parent.user.email}</span>
              </div>
              {parent.user.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{parent.user.phone}</span>
                </div>
              )}
              {parent.occupation && (
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{parent.occupation}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <PhoneCall className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm capitalize">
                  Prefers {parent.preferredContactMethod}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Joined {new Date(parent.user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Linked Children
              </CardTitle>
              <CardDescription>
                Students linked to this parent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {parent.studentLinks.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">
                    No children linked yet
                  </p>
                  <div className="mt-4 flex justify-center">
                    <LinkChildrenDialog
                      parentId={params.parentId}
                      existingStudentIds={[]}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {parent.studentLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          firstName={link.studentProfile.user.firstName}
                          lastName={link.studentProfile.user.lastName}
                          avatarUrl={link.studentProfile.user.avatarUrl}
                          className="h-10 w-10"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {link.studentProfile.user.firstName}{" "}
                              {link.studentProfile.user.lastName}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {link.relationshipType}
                            </Badge>
                            {link.isPrimaryForStudent && (
                              <Badge variant="secondary" className="text-xs">
                                Primary Parent
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {link.studentProfile.studentId} - {link.studentProfile.gradeLevel}
                          </p>
                          <div className="mt-1 flex gap-3">
                            {link.isEmergencyContact && (
                              <span className="flex items-center gap-1 text-xs text-red-600">
                                <Shield className="h-3 w-3" />
                                Emergency Contact
                              </span>
                            )}
                            {link.canPickup && (
                              <span className="flex items-center gap-1 text-xs text-green-600">
                                <Car className="h-3 w-3" />
                                Can Pick Up
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <form
                        action={async () => {
                          "use server"
                          await unlinkStudent(link.studentProfile.id)
                        }}
                      >
                        <Button variant="ghost" size="icon" type="submit">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </form>
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
