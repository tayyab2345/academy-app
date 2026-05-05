-- Link local app users to Supabase Auth users.
-- New/migrated student and teacher local users use auth.users.id as users.id,
-- while this column keeps an explicit reference for lookup and safety.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "supabase_auth_user_id" TEXT;

ALTER TABLE "users"
  ALTER COLUMN "password_hash" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_supabase_auth_user_id_key"
  ON "users"("supabase_auth_user_id");
