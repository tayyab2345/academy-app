import { Metadata } from "next"
import Link from "next/link"
import { RegisterAcademyForm } from "@/components/auth/register-academy-form"

export const metadata: Metadata = {
  title: "Register Your Academy - AcademyFlow",
  description: "Create your academy and admin account",
}

export default function RegisterAcademyPage() {
  return (
    <div className="container relative min-h-screen flex-col items-center justify-center lg:max-w-none lg:px-0">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6">
        <div className="flex flex-col space-y-2 text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-bold tracking-tight">
              AcademyFlow
            </h1>
          </Link>
        </div>
        <RegisterAcademyForm />
        <p className="text-sm text-muted-foreground text-center">
          Already have an academy?{" "}
          <Link
            href="/login"
            className="text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
