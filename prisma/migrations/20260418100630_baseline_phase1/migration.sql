-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'teacher', 'student', 'parent');

-- CreateTable
CREATE TABLE "academies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "logo_url" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#059669',
    "secondary_color" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "contact_email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_academy_owner" BOOLEAN NOT NULL DEFAULT false,
    "academy_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academies_subdomain_key" ON "academies"("subdomain" ASC);

-- CreateIndex
CREATE INDEX "users_academy_id_role_idx" ON "users"("academy_id" ASC, "role" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_academy_id_key" ON "users"("email" ASC, "academy_id" ASC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_academy_id_fkey" FOREIGN KEY ("academy_id") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

