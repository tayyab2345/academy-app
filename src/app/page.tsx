import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bell,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileBadge,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const keyFeatures = [
  {
    title: "Attendance & late tracking",
    description: "Session joins, late minutes, teacher tracking, and parent visibility stay connected.",
    icon: CalendarClock,
    accent: "emerald",
  },
  {
    title: "Fees, invoices & payroll",
    description: "Keep incoming student billing separate from outgoing staff salaries and slips.",
    icon: Banknote,
    accent: "sky",
  },
  {
    title: "Exams, reports & PDFs",
    description: "Results, marksheets, reports, salary slips, and secure document access in one place.",
    icon: FileBadge,
    accent: "violet",
  },
  {
    title: "Announcements & notifications",
    description: "Targeted updates for admins, teachers, students, and linked parents.",
    icon: Bell,
    accent: "orange",
  },
]

const rolePortals = [
  {
    role: "Admin",
    description: "Manage academy setup, classes, staff, finance, payroll, reports, and security.",
    icon: LayoutDashboard,
  },
  {
    role: "Teacher",
    description: "View assigned classes, join sessions, mark attendance, post updates, and publish reports.",
    icon: GraduationCap,
  },
  {
    role: "Student",
    description: "See classes, join links, attendance, results, reports, fees, and announcements.",
    icon: BookOpenCheck,
  },
  {
    role: "Parent",
    description: "Follow linked child progress, attendance, fees, reports, and class notifications.",
    icon: UsersRound,
  },
]

const workflowSteps = [
  "Create academy",
  "Add people",
  "Schedule classes",
  "Track progress",
]

const trustBadges = [
  "Supabase Auth linked users",
  "Academy-scoped RLS policies",
  "Secure document access",
  "Role-based portals",
]

function LogoMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-700 text-xl font-black text-white shadow-lg shadow-emerald-500/25">
        A
      </div>
      <div>
        <p className="text-lg font-black tracking-tight text-slate-950">AcademyFlow</p>
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-700">Academy SaaS</p>
      </div>
    </div>
  )
}

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[640px]">
      <div className="absolute -left-4 top-10 hidden h-28 w-28 rounded-full bg-emerald-300/30 blur-2xl sm:block" />
      <div className="absolute -right-8 bottom-8 hidden h-36 w-36 rounded-full bg-sky-300/30 blur-2xl sm:block" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur-xl sm:p-4">
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-950 p-4 text-white sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400 text-sm font-black text-slate-950">
                A
              </div>
              <div>
                <p className="text-sm font-bold">Live academy dashboard</p>
                <p className="text-xs text-slate-400">Real-time operations center</p>
              </div>
            </div>
            <div className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              Secure
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["Students", "1,248", "+12%"],
              ["Attendance", "92%", "Today"],
              ["Revenue", "$24.5k", "This month"],
            ].map(([label, value, meta]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
                <p className="mt-2 text-xs font-medium text-emerald-200">{meta}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold">Recent activity</p>
                <LineChart className="h-4 w-4 text-emerald-300" />
              </div>
              <div className="space-y-3">
                {[
                  ["Class created", "Quran Pak schedule synced"],
                  ["Attendance marked", "2 late joins recorded"],
                  ["Invoice sent", "Parent notification delivered"],
                ].map(([title, detail]) => (
                  <div key={title} className="flex items-start gap-3 rounded-xl bg-white/[0.05] p-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-300" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{title}</p>
                      <p className="truncate text-xs text-slate-400">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-400/20 to-sky-400/10 p-4">
              <p className="text-sm font-bold">Today&apos;s class</p>
              <div className="mt-4 rounded-2xl bg-white p-4 text-slate-950 shadow-xl shadow-black/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black">Quran Recitation</p>
                    <p className="mt-1 text-sm text-slate-500">10:00 AM - 10:30 AM</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    Live soon
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-200">
                <div className="rounded-xl bg-white/10 p-3">Teacher notified</div>
                <div className="rounded-xl bg-white/10 p-3">Parents linked</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
        <Sparkles className="h-4 w-4" />
        {eyebrow}
      </div>
      <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">{description}</p>
    </div>
  )
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7fbfb] text-slate-950">
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_12%,rgba(16,185,129,0.20),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(14,165,233,0.16),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#ecfdf5_100%)]" />
        <div className="absolute left-1/2 top-0 -z-10 h-[560px] w-[560px] -translate-x-1/2 rounded-full border border-emerald-200/60 opacity-60" />

        <div className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pb-24">
          <header className="flex items-center justify-between gap-4 rounded-full border border-white/70 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-5">
            <LogoMark />
            <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
              <a href="#features" className="transition hover:text-emerald-700">
                Features
              </a>
              <a href="#roles" className="transition hover:text-emerald-700">
                Portals
              </a>
              <a href="#security" className="transition hover:text-emerald-700">
                Security
              </a>
              <a href="#workflow" className="transition hover:text-emerald-700">
                Workflow
              </a>
            </nav>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" className="hidden rounded-full bg-white/80 sm:inline-flex">
                <Link href="/login">Open Login</Link>
              </Button>
              <Button asChild className="rounded-full bg-emerald-600 shadow-lg shadow-emerald-500/20 hover:bg-emerald-700">
                <Link href="/register/academy" className="inline-flex items-center gap-2">
                  Create Academy
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </header>

          <div className="grid items-center gap-12 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:py-20">
            <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-sm font-bold text-emerald-800 shadow-sm">
                <ShieldCheck className="h-4 w-4" />
                All-in-one academy management platform
              </div>

              <h1 className="mt-6 text-5xl font-black tracking-[-0.05em] text-slate-950 sm:text-6xl lg:text-7xl">
                Run your academy with calm, control, and clarity.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 lg:mx-0">
                AcademyFlow brings admissions, classes, attendance, results, finance, payroll,
                documents, and parent communication into one secure role-based workspace.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-7 text-base font-black shadow-xl shadow-emerald-500/25 hover:from-emerald-700 hover:to-teal-600"
                >
                  <Link href="/register/academy" className="inline-flex items-center justify-center gap-2">
                    Create your academy
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-2xl border-slate-200 bg-white/90 px-7 text-base font-black shadow-sm"
                >
                  <Link href="/login" className="inline-flex items-center justify-center gap-2">
                    Open Login
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>

              <div className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                {["No demo data required", "Role-safe portals", "Mobile-ready dashboards"].map((item) => (
                  <div key={item} className="flex items-center justify-center gap-2 lg:justify-start">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="font-semibold">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <DashboardPreview />
          </div>
        </div>
      </section>

      <section id="features" className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Core platform"
            title="Everything important, designed as one operating system."
            description="Replace scattered spreadsheets and WhatsApp follow-ups with clean workflows that connect every role in the academy."
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {keyFeatures.map((feature) => (
              <article
                key={feature.title}
                className="group rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-900/10"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 transition group-hover:bg-emerald-600 group-hover:text-white">
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-6 text-xl font-black tracking-tight">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
                <div className="mt-6 flex items-center text-sm font-black text-emerald-700">
                  Built in
                  <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="roles" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl shadow-slate-900/15 lg:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
              <UsersRound className="h-7 w-7" />
            </div>
            <h2 className="mt-8 text-3xl font-black tracking-tight sm:text-4xl">
              Four portals. One source of truth.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Each role sees exactly what they need. Admins stay in control while teachers,
              students, and parents get focused dashboards.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {["Admin", "Teacher", "Student", "Parent"].map((role) => (
                <span key={role} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold">
                  {role}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {rolePortals.map((portal) => (
              <article
                key={portal.role}
                className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <portal.icon className="h-6 w-6" />
                  </div>
                  <BadgeCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="mt-5 text-2xl font-black tracking-tight">{portal.role} portal</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{portal.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-emerald-100 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_34%),linear-gradient(135deg,#f8fafc,#ecfdf5)] p-6 shadow-xl shadow-emerald-900/5 sm:p-10 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-emerald-700 shadow-sm">
                <LockKeyhole className="h-4 w-4" />
                Trust and data isolation
              </div>
              <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Built for real academy data, not a loose demo.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                Supabase Auth linked users, academy-scoped database policies, secure document
                storage, and server-side checks help keep each academy&apos;s data separated.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {trustBadges.map((badge) => (
                <div key={badge} className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-black text-slate-800">{badge}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Simple workflow"
            title="Start small, then run the whole academy from one place."
            description="A clean setup flow helps you move from registration to daily operations without overwhelming your team."
          />

          <div className="mt-12 grid gap-4 md:grid-cols-4">
            {workflowSteps.map((step, index) => (
              <div key={step} className="relative rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white">
                  {index + 1}
                </div>
                <h3 className="mt-6 text-xl font-black">{step}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {index === 0 && "Register your academy and create the owner workspace."}
                  {index === 1 && "Add admins, teachers, students, and linked parents."}
                  {index === 2 && "Create courses, assign teachers, enroll students, and add Zoom links."}
                  {index === 3 && "Monitor attendance, reports, fees, payroll, posts, and notifications."}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Ready to open your academy workspace?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Create a new academy or sign in to continue managing your existing one.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="rounded-2xl bg-emerald-500 px-6 font-black hover:bg-emerald-400">
                  <Link href="/register/academy">Create Academy</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-2xl border-white/15 bg-white/10 px-6 font-black text-white hover:bg-white hover:text-slate-950">
                  <Link href="/login">Open Login</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
