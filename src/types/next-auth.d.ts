import { DefaultSession } from "next-auth"
import { JWT as DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      firstName: string
      lastName: string
      phone: string | null
      avatarUrl: string | null
      role: 'admin' | 'teacher' | 'student' | 'parent'
      isAcademyOwner: boolean
      academyId: string
      academy: {
        id: string
        name: string
        subdomain: string
        contactEmail: string
        primaryColor: string
        logoUrl: string | null
        isDeleted: boolean
        deletedAt: string | null
      }
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    email: string
    firstName: string
    lastName: string
    phone: string | null
    avatarUrl: string | null
    role: 'admin' | 'teacher' | 'student' | 'parent'
    isAcademyOwner: boolean
    academyId: string
    academy: {
      id: string
      name: string
      subdomain: string
      contactEmail: string
      primaryColor: string
      logoUrl: string | null
      isDeleted: boolean
      deletedAt: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    email: string
    firstName: string
    lastName: string
    phone: string | null
    avatarUrl: string | null
    role: 'admin' | 'teacher' | 'student' | 'parent'
    isAcademyOwner: boolean
    academyId: string
    academy: {
      id: string
      name: string
      subdomain: string
      contactEmail: string
      primaryColor: string
      logoUrl: string | null
      isDeleted: boolean
      deletedAt: string | null
    }
  }
}
