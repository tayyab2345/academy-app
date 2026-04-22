import Link from "next/link"
import { ArrowRight, BarChart3, Bell, CreditCard, FileText, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HomeSessionRedirect } from "@/components/auth/home-session-redirect"

export default async function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(5,150,105,0.14),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#ecfdf5_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <HomeSessionRedirect />
      <div className="mx-auto flex min-h-[80vh] max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-8">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/90">
                AcademyFlow
              </p>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Run your academy from admissions to payroll in one clear workspace.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Manage classes, attendance, finance, results, reports, payroll, and parent
                communication with role-based portals built for daily academy operations.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href="/login" className="inline-flex items-center gap-2">
                  <span>Open Login</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/register/academy">Create Academy</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  title: "Attendance",
                  description: "Teacher marking, admin review, student and parent visibility.",
                  icon: GraduationCap,
                },
                {
                  title: "Finance",
                  description: "Invoices, fee plans, manual payments, and payroll in one place.",
                  icon: CreditCard,
                },
                {
                  title: "Results",
                  description: "Exam management, marks entry, and secure report file access.",
                  icon: BarChart3,
                },
                {
                  title: "Communication",
                  description: "Announcements, comments, notifications, and secure sharing.",
                  icon: Bell,
                },
              ].map((item) => (
                <Card key={item.title} className="border-white/70 bg-white/80 shadow-sm backdrop-blur">
                  <CardHeader className="space-y-3 pb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <CardDescription className="mt-1 text-sm leading-6 text-slate-600">
                        {item.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>

          <Card className="border-primary/15 bg-slate-950 text-white shadow-xl">
            <CardHeader className="space-y-4">
              <CardTitle className="text-2xl">Everything your team needs, without the spreadsheet chaos.</CardTitle>
              <CardDescription>
                Admin, teachers, students, and parents each get a focused portal with the same
                academy data at the center.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Core Modules</p>
                <div className="mt-3 grid gap-3 text-sm text-slate-200">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 text-emerald-300" />
                    <span>Reports, results, salary slips, PDFs, and secure documents.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <GraduationCap className="mt-0.5 h-4 w-4 text-emerald-300" />
                    <span>Recurring schedules, sessions, attendance, and late-join tracking.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CreditCard className="mt-0.5 h-4 w-4 text-emerald-300" />
                    <span>Billing and payroll workflows kept separate but equally visible.</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 p-4 text-sm text-slate-200">
                Start with a new academy registration, or sign in to continue from your existing
                admin, teacher, student, or parent portal.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
