import { NextAuthOptions } from "next-auth"
import type { Session } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { formatPrismaError, prisma } from "./prisma"
import {
  isDemoModeEnabled,
  shouldLogRuntimeDiagnostics,
  shouldSkipSubdomainCheck,
} from "./runtime-flags"
import {
  getSupabaseAuthEnvStatus,
  isSupabasePasswordAuthConfigured,
  normalizeAuthEmail,
  signInWithSupabasePassword,
} from "./supabase-auth"
import { resolveAcademyTimeZone } from "./time-zone"

let authDiagnosticsLogged = false
const ACADEMY_TOKEN_REFRESH_INTERVAL_MS = 5 * 60 * 1000

function logAuthDiagnostics() {
  if (!shouldLogRuntimeDiagnostics()) {
    return
  }

  if (authDiagnosticsLogged) {
    return
  }

  console.info("[next-auth] runtime environment", {
    nodeEnv: process.env.NODE_ENV,
    hasNextAuthUrl: Boolean(process.env.NEXTAUTH_URL),
    nextAuthUrl: process.env.NEXTAUTH_URL ?? null,
    hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
    supabaseAuth: getSupabaseAuthEnvStatus(),
    demoMode: isDemoModeEnabled(),
    skipSubdomainCheck: shouldSkipSubdomainCheck(),
  })

  authDiagnosticsLogged = true
}

logAuthDiagnostics()

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required")
        }

        try {
          const normalizedEmail = normalizeAuthEmail(credentials.email)
          const supabasePasswordAuthConfigured = isSupabasePasswordAuthConfigured()

          let user = null

          if (supabasePasswordAuthConfigured) {
            const supabaseSignIn = await signInWithSupabasePassword(
              normalizedEmail,
              credentials.password
            )

            if (supabaseSignIn.ok) {
              user = await prisma.user.findFirst({
                where: {
                  OR: [
                    { supabaseAuthUserId: supabaseSignIn.user.id },
                    { id: supabaseSignIn.user.id },
                    { email: normalizedEmail },
                  ],
                },
                include: {
                  academy: {
                    select: {
                      id: true,
                      name: true,
                      subdomain: true,
                      contactEmail: true,
                      primaryColor: true,
                      logoUrl: true,
                      timezone: true,
                      isDeleted: true,
                      deletedAt: true,
                    },
                  },
                },
              })

              if (user && user.supabaseAuthUserId !== supabaseSignIn.user.id) {
                await prisma.user.update({
                  where: { id: user.id },
                  data: {
                    supabaseAuthUserId: supabaseSignIn.user.id,
                  },
                })
                user.supabaseAuthUserId = supabaseSignIn.user.id
              }
            } else if (!supabaseSignIn.unavailable) {
              console.info("[next-auth][authorize][supabase] password check failed", {
                email: normalizedEmail,
                message: supabaseSignIn.message,
              })
            } else {
              console.warn("[next-auth][authorize][supabase] unavailable", {
                email: normalizedEmail,
                message: supabaseSignIn.message,
              })
            }
          }

          if (!user) {
            // Local password fallback keeps existing admin/parent accounts usable.
            // Student/teacher accounts use Supabase Auth when Supabase is configured.
            user = await prisma.user.findUnique({
              where: {
                email: normalizedEmail,
              },
              include: {
                academy: {
                  select: {
                    id: true,
                    name: true,
                    subdomain: true,
                    contactEmail: true,
                    primaryColor: true,
                    logoUrl: true,
                    timezone: true,
                    isDeleted: true,
                    deletedAt: true,
                  },
                }
              }
            })

            if (
              user &&
              supabasePasswordAuthConfigured &&
              (user.role === "student" || user.role === "teacher")
            ) {
              throw new Error("Invalid email or password")
            }

            if (!user?.passwordHash) {
              throw new Error("Invalid email or password")
            }

            const isPasswordValid = await bcrypt.compare(
              credentials.password,
              user.passwordHash
            )

            if (!isPasswordValid) {
              throw new Error("Invalid email or password")
            }
          }

          if (!user || !user.isActive) {
            throw new Error("Invalid email or password")
          }

          if (user.academy.isDeleted && user.role !== "admin") {
            throw new Error("ACADEMY_DEACTIVATED")
          }

          // Return user object (exclude sensitive data)
          return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
            role: user.role,
            adminPermissionType: user.adminPermissionType,
            isAcademyOwner: user.isAcademyOwner,
            academyId: user.academyId,
            academy: {
              id: user.academy.id,
              name: user.academy.name,
              subdomain: user.academy.subdomain,
              contactEmail: user.academy.contactEmail,
              primaryColor: user.academy.primaryColor,
              logoUrl: user.academy.logoUrl,
              timezone: resolveAcademyTimeZone(user.academy.timezone),
              isDeleted: user.academy.isDeleted,
              deletedAt: user.academy.deletedAt?.toISOString() || null,
            }
          }
        } catch (error) {
          if (
            error instanceof Error &&
            ["Email and password are required", "Invalid email or password", "ACADEMY_DEACTIVATED"].includes(error.message)
          ) {
            throw error
          }

          console.error("[next-auth][authorize] failed", {
            email: credentials.email,
            demoMode: isDemoModeEnabled(),
            prisma: formatPrismaError(error),
          })

          throw new Error("AUTHENTICATION_UNAVAILABLE")
        }
      }
    })
  ],
  
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in - add user data to token
      if (user) {
        const refreshedAt = Date.now()

        token.id = user.id
        token.email = user.email
        token.firstName = user.firstName
        token.lastName = user.lastName
        token.phone = user.phone
        token.avatarUrl = user.avatarUrl
        token.role = user.role
        token.adminPermissionType = user.adminPermissionType
        token.isAcademyOwner = user.isAcademyOwner
        token.academyId = user.academyId
        token.academy = user.academy
        token.academyRefreshedAt = refreshedAt
      }

      if (trigger === "update" && session?.user) {
        token.firstName = session.user.firstName
        token.lastName = session.user.lastName
        token.phone = session.user.phone
        token.avatarUrl = session.user.avatarUrl
        token.role = session.user.role
        token.adminPermissionType = session.user.adminPermissionType
        token.isAcademyOwner = session.user.isAcademyOwner
        token.academyId = session.user.academyId
        token.academy = session.user.academy
        token.academyRefreshedAt = Date.now()
      }

      const lastAcademyRefresh =
        typeof token.academyRefreshedAt === "number"
          ? token.academyRefreshedAt
          : 0
      const shouldRefreshAcademy =
        Boolean(token.academyId) &&
        (!token.academy ||
          !(token.academy as any)?.timezone ||
          !lastAcademyRefresh ||
          Date.now() - lastAcademyRefresh > ACADEMY_TOKEN_REFRESH_INTERVAL_MS)

      if (shouldRefreshAcademy) {
        try {
          const academy = await prisma.academy.findUnique({
            where: { id: token.academyId as string },
            select: {
              id: true,
              name: true,
              subdomain: true,
              contactEmail: true,
              primaryColor: true,
              logoUrl: true,
              timezone: true,
              isDeleted: true,
              deletedAt: true,
            },
          })

          if (academy) {
            token.academy = {
              ...academy,
              timezone: resolveAcademyTimeZone(academy.timezone),
              deletedAt: academy.deletedAt?.toISOString() || null,
            }
            token.academyRefreshedAt = Date.now()
          }
        } catch (error) {
          console.error("[auth/session][next-auth][jwt][academy-refresh] failed", {
            academyId: token.academyId,
            demoMode: isDemoModeEnabled(),
            prisma: formatPrismaError(error),
          })
        }
      }
      
      return token
    },
    
    async session({ session, token }) {
      // Add token data to session
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.firstName = token.firstName as string
        session.user.lastName = token.lastName as string
        session.user.phone = (token.phone as string | null | undefined) ?? null
        session.user.avatarUrl = (token.avatarUrl as string | null | undefined) ?? null
        session.user.role = token.role as "admin" | "teacher" | "student" | "parent"
        session.user.adminPermissionType =
          (token.adminPermissionType as "full_admin" | "limited_admin" | null | undefined) ?? null
        session.user.isAcademyOwner = token.isAcademyOwner as boolean
        session.user.academyId = token.academyId as string
        const tokenAcademy = token.academy as
          | (Session["user"]["academy"] & { timezone?: string | null })
          | undefined
        session.user.academy = {
          ...(tokenAcademy as Session["user"]["academy"]),
          timezone: resolveAcademyTimeZone(tokenAcademy?.timezone),
        }
      }
      
      return session
    },
    
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  
  pages: {
    signIn: '/login',
    error: '/login',
  },
  
  secret: process.env.NEXTAUTH_SECRET,
  
  debug: process.env.NODE_ENV === 'development',
}
