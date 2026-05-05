import { createClient, type User as SupabaseUser } from "@supabase/supabase-js"

type SupabaseAuthRole = "teacher" | "student" | "admin" | "parent"

type CreateOrLinkAuthUserInput = {
  email: string
  password: string
  role: SupabaseAuthRole
  academyId: string
  firstName: string
  lastName: string
  phone?: string | null
}

type SupabaseAuthUserResult = {
  user: SupabaseUser
  created: boolean
}

type SupabasePasswordSignInResult =
  | {
      ok: true
      user: SupabaseUser
      unavailable?: false
      message?: never
    }
  | {
      ok: false
      unavailable: boolean
      message: string
    }

const SUPABASE_AUTH_LIST_PAGE_SIZE = 1000
const SUPABASE_AUTH_LIST_MAX_PAGES = 25

let adminClient: ReturnType<typeof createClient> | null = null
let passwordClient: ReturnType<typeof createClient> | null = null

export function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase()
}

export function getLinkedSupabaseAuthUserId(user: {
  id: string
  supabaseAuthUserId?: string | null
}) {
  if (user.supabaseAuthUserId) {
    return user.supabaseAuthUserId
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    user.id
  )
    ? user.id
    : null
}

export function getSupabaseAuthEnvStatus() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  return {
    hasUrl: Boolean(url),
    hasAnonKey: Boolean(anonKey),
    hasServiceRoleKey: Boolean(serviceRoleKey),
    canVerifyPasswords: Boolean(url && anonKey),
    canManageUsers: Boolean(url && serviceRoleKey),
  }
}

export function isSupabasePasswordAuthConfigured() {
  return getSupabaseAuthEnvStatus().canVerifyPasswords
}

export function isSupabaseAdminAuthConfigured() {
  return getSupabaseAuthEnvStatus().canManageUsers
}

function assertServerSideSupabaseAuth() {
  if (typeof window !== "undefined") {
    throw new Error("Supabase service role helpers can only run on the server")
  }
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
}

function getSupabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

function getSupabaseAdminClient() {
  assertServerSideSupabaseAuth()

  const supabaseUrl = getSupabaseUrl()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase Auth admin is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    )
  }

  if (!adminClient) {
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return adminClient
}

function getSupabasePasswordClient() {
  assertServerSideSupabaseAuth()

  const supabaseUrl = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()

  if (!supabaseUrl || !anonKey) {
    return null
  }

  if (!passwordClient) {
    passwordClient = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return passwordClient
}

export async function signInWithSupabasePassword(
  email: string,
  password: string
): Promise<SupabasePasswordSignInResult> {
  const client = getSupabasePasswordClient()

  if (!client) {
    return {
      ok: false,
      unavailable: true,
      message:
        "Supabase password auth is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY.",
    }
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: normalizeAuthEmail(email),
    password,
  })

  if (error || !data.user) {
    return {
      ok: false,
      unavailable: false,
      message: error?.message || "Invalid email or password",
    }
  }

  await client.auth.signOut()

  return {
    ok: true,
    user: data.user,
  }
}

export async function findSupabaseAuthUserByEmail(email: string) {
  const client = getSupabaseAdminClient()
  const normalizedEmail = normalizeAuthEmail(email)

  for (let page = 1; page <= SUPABASE_AUTH_LIST_MAX_PAGES; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: SUPABASE_AUTH_LIST_PAGE_SIZE,
    })

    if (error) {
      throw error
    }

    const foundUser = (data.users as SupabaseUser[]).find(
      (user) => normalizeAuthEmail(user.email || "") === normalizedEmail
    )

    if (foundUser) {
      return foundUser
    }

    if (data.users.length < SUPABASE_AUTH_LIST_PAGE_SIZE) {
      break
    }
  }

  return null
}

export async function createOrLinkSupabasePasswordUser(
  input: CreateOrLinkAuthUserInput
): Promise<SupabaseAuthUserResult> {
  const client = getSupabaseAdminClient()
  const email = normalizeAuthEmail(input.email)
  const existingUser = await findSupabaseAuthUserByEmail(email)

  if (existingUser) {
    return {
      user: existingUser,
      created: false,
    }
  }

  const { data, error } = await client.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      role: input.role,
      academy_id: input.academyId,
      first_name: input.firstName,
      last_name: input.lastName,
    },
  })

  if (error || !data.user) {
    if (error?.message?.toLowerCase().includes("already")) {
      const duplicateUser = await findSupabaseAuthUserByEmail(email)

      if (duplicateUser) {
        return {
          user: duplicateUser,
          created: false,
        }
      }
    }

    throw error || new Error("Supabase Auth user was not created")
  }

  return {
    user: data.user,
    created: true,
  }
}

export async function updateSupabasePasswordUser(
  userId: string,
  input: {
    email?: string
    password?: string
    firstName?: string
    lastName?: string
    phone?: string | null
    role?: SupabaseAuthRole
    academyId?: string
  }
) {
  const client = getSupabaseAdminClient()

  const { error } = await client.auth.admin.updateUserById(userId, {
    email: input.email ? normalizeAuthEmail(input.email) : undefined,
    password: input.password,
    user_metadata: {
      role: input.role,
      academy_id: input.academyId,
      first_name: input.firstName,
      last_name: input.lastName,
    },
  })

  if (error) {
    throw error
  }
}

export async function deleteSupabaseAuthUser(userId: string) {
  const client = getSupabaseAdminClient()
  const { error } = await client.auth.admin.deleteUser(userId)

  if (error) {
    throw error
  }
}
