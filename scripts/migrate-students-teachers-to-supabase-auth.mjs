import { randomBytes } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { PrismaClient } from "@prisma/client"
import { createClient } from "@supabase/supabase-js"

const prisma = new PrismaClient()

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const defaultPassword = process.env.SUPABASE_MIGRATION_DEFAULT_PASSWORD || ""
const resetExistingPassword =
  process.env.SUPABASE_MIGRATION_SET_EXISTING_PASSWORD === "true"

const pageSize = 1000
const maxPages = 25

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

function generatePassword() {
  if (defaultPassword) {
    return defaultPassword
  }

  return `${randomBytes(18).toString("base64url")}Aa1!`
}

async function findSupabaseAuthUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email)

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: pageSize,
    })

    if (error) {
      throw error
    }

    const found = data.users.find(
      (user) => normalizeEmail(user.email || "") === normalizedEmail
    )

    if (found) {
      return found
    }

    if (data.users.length < pageSize) {
      break
    }
  }

  return null
}

async function createOrUpdateSupabaseUser(user, password) {
  const email = normalizeEmail(user.email)
  const existingAuthUser = await findSupabaseAuthUserByEmail(email)

  if (existingAuthUser) {
    if (resetExistingPassword) {
      const { error } = await supabase.auth.admin.updateUserById(
        existingAuthUser.id,
        {
          email,
          password,
          email_confirm: true,
          user_metadata: {
            role: user.role,
            academy_id: user.academyId,
            first_name: user.firstName,
            last_name: user.lastName,
          },
        }
      )

      if (error) {
        throw error
      }
    }

    return {
      authUser: existingAuthUser,
      created: false,
    }
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: user.role,
      academy_id: user.academyId,
      first_name: user.firstName,
      last_name: user.lastName,
    },
  })

  if (error || !data.user) {
    throw error || new Error(`Supabase user was not created for ${email}`)
  }

  return {
    authUser: data.user,
    created: true,
  }
}

async function relinkLocalUserToSupabaseAuthId(user, authUserId) {
  if (user.id === authUserId) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: normalizeEmail(user.email),
        passwordHash: null,
        supabaseAuthUserId: authUserId,
      },
    })
    return
  }

  const conflictingUser = await prisma.user.findFirst({
    where: {
      OR: [{ id: authUserId }, { supabaseAuthUserId: authUserId }],
      id: { not: user.id },
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  })

  if (conflictingUser) {
    throw new Error(
      `Supabase auth user ${authUserId} is already linked to ${conflictingUser.email}`
    )
  }

  // Updating the local user primary key preserves all existing linked data through
  // ON UPDATE CASCADE foreign keys, including profile rows, notifications, posts,
  // reports, fees, and attendance records.
  await prisma.$executeRaw`
    UPDATE "users"
    SET
      "id" = ${authUserId},
      "supabase_auth_user_id" = ${authUserId},
      "password_hash" = NULL,
      "email" = ${normalizeEmail(user.email)}
    WHERE "id" = ${user.id}
  `
}

async function main() {
  const users = await prisma.user.findMany({
    where: {
      role: {
        in: ["student", "teacher"],
      },
      email: {
        not: "",
      },
    },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      supabaseAuthUserId: true,
      role: true,
      firstName: true,
      lastName: true,
      phone: true,
      academyId: true,
      studentProfile: {
        select: { id: true },
      },
      teacherProfile: {
        select: { id: true },
      },
    },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  })

  const results = []

  for (const user of users) {
    const hasExpectedProfile =
      user.role === "student"
        ? Boolean(user.studentProfile)
        : Boolean(user.teacherProfile)

    if (!hasExpectedProfile) {
      results.push({
        email: user.email,
        role: user.role,
        status: "skipped",
        reason: "Missing matching profile row",
      })
      continue
    }

    const password = generatePassword()

    try {
      const { authUser, created } = await createOrUpdateSupabaseUser(
        user,
        password
      )

      await relinkLocalUserToSupabaseAuthId(user, authUser.id)

      results.push({
        email: normalizeEmail(user.email),
        role: user.role,
        status: "linked",
        authUserId: authUser.id,
        authUserCreated: created,
        password:
          created || resetExistingPassword
            ? password
            : "unchanged-existing-supabase-password",
      })

      console.log(
        `[ok] ${user.role} ${user.email} -> Supabase Auth ${authUser.id}`
      )
    } catch (error) {
      results.push({
        email: user.email,
        role: user.role,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      })
      console.error(`[failed] ${user.role} ${user.email}`, error)
    }
  }

  await mkdir(".migration-output", { recursive: true })
  const outputPath = path.join(
    ".migration-output",
    `supabase-auth-migration-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`
  )
  await writeFile(outputPath, JSON.stringify(results, null, 2))

  const linkedCount = results.filter((result) => result.status === "linked").length
  const failedCount = results.filter((result) => result.status === "failed").length

  console.log(
    `Done. Linked ${linkedCount}/${results.length} users. Failures: ${failedCount}.`
  )
  console.log(`Credential/link report written to ${outputPath}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
