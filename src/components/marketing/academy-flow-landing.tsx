"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Bell,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Clock,
  Database,
  DollarSign,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Lock,
  Menu,
  Shield,
  UserCheck,
  Users,
  X,
} from "lucide-react"

const loginHref = "/login"
const createAcademyHref = "/register/academy"

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Portals", href: "#portals" },
  { label: "Security", href: "#security" },
  { label: "Workflow", href: "#workflow" },
]

const features = [
  {
    title: "Attendance & late tracking",
    description: "Session joins, late minutes, teacher tracking, and parent visibility stay connected.",
    icon: UserCheck,
    tone: "emerald",
  },
  {
    title: "Fees, invoices & payroll",
    description: "Keep incoming student billing separate from outgoing staff salaries and slips.",
    icon: DollarSign,
    tone: "amber",
  },
  {
    title: "Exams, reports & PDFs",
    description: "Results, marksheets, reports, salary slips, and secure document access in one place.",
    icon: FileText,
    tone: "blue",
  },
  {
    title: "Announcements & notifications",
    description: "Targeted updates for admins, teachers, students, and linked parents.",
    icon: Bell,
    tone: "purple",
  },
]

const portals = [
  {
    title: "Admin Portal",
    description: "Manage academy setup, classes, staff, finance, payroll, reports, and security.",
    icon: Shield,
    iconClass: "bg-slate-950 text-emerald-400",
  },
  {
    title: "Teacher Portal",
    description: "View assigned classes, join sessions, mark attendance, post updates, and publish reports.",
    icon: BookOpen,
    iconClass: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Student Portal",
    description: "See class links, attendance, results, reports, fees, and announcements.",
    icon: GraduationCap,
    iconClass: "bg-teal-100 text-teal-700",
  },
  {
    title: "Parent Portal",
    description: "Follow linked child progress, attendance, fees, reports, and class notifications.",
    icon: Users,
    iconClass: "bg-amber-100 text-amber-700",
  },
]

const workflowSteps = [
  { step: "01", title: "Create academy", description: "Register and create the owner workspace." },
  { step: "02", title: "Add people", description: "Add admins, teachers, students, and linked parents." },
  { step: "03", title: "Schedule classes", description: "Set recurring schedules and live session links." },
  { step: "04", title: "Track progress", description: "Monitor attendance, results, finances, and reports." },
]

function toneClasses(tone: string) {
  if (tone === "amber") {
    return {
      icon: "from-amber-100 to-orange-100 text-amber-600",
      pill: "bg-amber-50 text-amber-600",
    }
  }

  if (tone === "blue") {
    return {
      icon: "from-blue-100 to-indigo-100 text-blue-600",
      pill: "bg-blue-50 text-blue-600",
    }
  }

  if (tone === "purple") {
    return {
      icon: "from-purple-100 to-pink-100 text-purple-600",
      pill: "bg-purple-50 text-purple-600",
    }
  }

  return {
    icon: "from-emerald-100 to-teal-100 text-emerald-600",
    pill: "bg-emerald-50 text-emerald-600",
  }
}

export function AcademyFlowLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5FBF8] to-white font-sans text-[#0A1A2F]">
      <nav className="nav-blur fixed left-0 right-0 top-0 z-50 border-b border-emerald-100/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between lg:h-[4.5rem]">
            <Link href="/" className="flex items-center gap-2" aria-label="AcademyFlow home">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 shadow-md shadow-emerald-200">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-[#0A1A2F]">AcademyFlow</span>
            </Link>

            <div className="hidden items-center gap-8 text-sm font-medium text-[#2D3A4A] lg:flex">
              {navItems.map((item) => (
                <a key={item.href} href={item.href} className="transition-colors hover:text-emerald-600">
                  {item.label}
                </a>
              ))}
            </div>

            <div className="hidden items-center gap-3 lg:flex">
              <Link
                href={loginHref}
                className="px-4 py-2 text-sm font-semibold text-[#0A1A2F] transition-colors hover:text-emerald-700"
              >
                Open Login
              </Link>
              <Link
                href={createAcademyHref}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-600 hover:shadow-emerald-300"
              >
                Create Academy <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="rounded-lg p-2 transition-colors hover:bg-white/50 lg:hidden"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-emerald-100 bg-white/95 backdrop-blur-xl lg:hidden">
            <div className="space-y-3 px-4 py-4">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 font-medium text-[#2D3A4A] hover:bg-emerald-50"
                >
                  {item.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 border-t border-gray-100 pt-2">
                <Link
                  href={loginHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-xl bg-gray-50 px-4 py-2.5 text-center font-semibold text-[#0A1A2F] transition-colors hover:bg-gray-100"
                >
                  Open Login
                </Link>
                <Link
                  href={createAcademyHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-white shadow-lg"
                >
                  Create Academy <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pb-24 lg:pt-36">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
              Built for secure academy operations
            </div>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#0A1A2F] sm:text-5xl lg:text-6xl">
              Run your academy with{" "}
              <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                calm, control, and clarity.
              </span>
            </h1>

            <p className="max-w-xl text-lg text-[#4B5A6A]">
              Admissions, classes, attendance, results, finance, payroll, documents, and parent
              communication in one secure, role-based workspace.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href={createAcademyHref}
                className="cta-pulse flex items-center gap-2 rounded-xl bg-emerald-500 px-7 py-3.5 font-semibold text-white shadow-xl shadow-emerald-200 transition-all hover:bg-emerald-600"
              >
                Create your academy <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={loginHref}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-7 py-3.5 font-semibold text-[#0A1A2F] shadow-sm transition-all hover:border-emerald-300 hover:shadow-md"
              >
                Open Login
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-4 text-sm text-[#4B5A6A]">
              <div className="flex items-center gap-1.5">
                <BadgeCheck className="h-4 w-4 text-emerald-500" /> No demo data required
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-emerald-500" /> Role-safe portals
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-emerald-500" /> Mobile-ready dashboards
              </div>
            </div>
          </div>

          <div className="relative lg:ml-4">
            <div className="mockup-shadow relative rounded-2xl border border-gray-100 bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
                    <LayoutDashboard className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-sm font-bold text-[#0A1A2F]">Live Dashboard</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <div className="h-2 w-2 rounded-full bg-emerald-300" />
                  <div className="h-2 w-2 rounded-full bg-emerald-200" />
                </div>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="stat-card rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-3">
                  <div className="mb-1 flex items-center gap-1 text-xs text-[#4B5A6A]">
                    <Users className="h-3 w-3" /> Students
                  </div>
                  <div className="text-xl font-bold text-[#0A1A2F]">1,248</div>
                  <div className="text-xs font-semibold text-emerald-600">+12%</div>
                </div>
                <div className="stat-card rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-3">
                  <div className="mb-1 flex items-center gap-1 text-xs text-[#4B5A6A]">
                    <UserCheck className="h-3 w-3" /> Attendance
                  </div>
                  <div className="text-xl font-bold text-[#0A1A2F]">92%</div>
                  <div className="text-xs font-semibold text-blue-600">Today</div>
                </div>
                <div className="stat-card rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-3">
                  <div className="mb-1 flex items-center gap-1 text-xs text-[#4B5A6A]">
                    <DollarSign className="h-3 w-3" /> Revenue
                  </div>
                  <div className="text-xl font-bold text-[#0A1A2F]">$24.5k</div>
                  <div className="text-xs font-semibold text-amber-600">This month</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-[#4B5A6A]">
                    <Activity className="h-3.5 w-3.5" /> Recent
                  </div>
                  <div className="space-y-1.5 text-xs text-[#4B5A6A]">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-emerald-500" /> Class created
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-amber-500" /> Late joins tracked
                    </div>
                    <div className="flex items-center gap-1">
                      <Bell className="h-3 w-3 text-blue-500" /> Invoice sent
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3 text-white">
                  <div className="mb-1 text-xs font-semibold opacity-90">Today&apos;s Class</div>
                  <div className="text-sm font-bold">Quran Recitation</div>
                  <div className="mt-1 text-xs opacity-80">10:00 AM - 10:30 AM</div>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-white/20 px-2 py-0.5">Live</span>
                  </div>
                </div>
              </div>

              <div className="absolute -right-3 -top-3 -z-10 h-20 w-20 rounded-full bg-emerald-100/40 blur-xl" />
              <div className="absolute -bottom-3 -left-3 -z-10 h-24 w-24 rounded-full bg-teal-100/30 blur-xl" />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center lg:mb-16">
            <h2 className="text-3xl font-bold text-[#0A1A2F] sm:text-4xl">
              Everything important, designed as one operating system.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[#4B5A6A]">
              Replace scattered spreadsheets and chat follow-ups with workflows that connect every
              role in the academy.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon
              const classes = toneClasses(feature.tone)

              return (
                <div key={feature.title} className="feature-card rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div
                    className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${classes.icon}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-[#0A1A2F]">{feature.title}</h3>
                  <p className="text-sm text-[#4B5A6A]">{feature.description}</p>
                  <span className={`mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${classes.pill}`}>
                    Built in
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="portals" className="bg-gradient-to-b from-[#F5FBF8] to-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-[#0A1A2F] sm:text-4xl">Four portals. One source of truth.</h2>
            <p className="mx-auto mt-3 max-w-xl text-[#4B5A6A]">
              Each role sees exactly what they need. Admins stay in control while teachers,
              students, and parents get focused dashboards.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {portals.map((portal) => {
              const Icon = portal.icon
              return (
                <div key={portal.title} className="gradient-border rounded-2xl bg-white p-5 shadow-sm">
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${portal.iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0A1A2F]">{portal.title}</h3>
                  <p className="mt-1 text-sm text-[#4B5A6A]">{portal.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="security" className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <Lock className="h-3.5 w-3.5" /> Enterprise-grade security
              </div>
              <h2 className="text-3xl font-bold text-[#0A1A2F] sm:text-4xl">
                Built for real academy data, not a loose demo.
              </h2>
              <p className="mt-4 text-[#4B5A6A]">
                Supabase Auth linked users, academy-scoped database policies, secure document
                storage, and server-side checks keep each academy&apos;s data separated.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Database className="mt-0.5 h-5 w-5 text-emerald-500" />
                  <div>
                    <div className="font-semibold text-[#0A1A2F]">Supabase Auth</div>
                    <div className="text-sm text-[#4B5A6A]">Linked users with row-level security</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 text-emerald-500" />
                  <div>
                    <div className="font-semibold text-[#0A1A2F]">Academy-scoped RLS</div>
                    <div className="text-sm text-[#4B5A6A]">Policies that isolate every academy</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 text-emerald-500" />
                  <div>
                    <div className="font-semibold text-[#0A1A2F]">Secure documents</div>
                    <div className="text-sm text-[#4B5A6A]">Storage access with role checks</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <UserCheck className="mt-0.5 h-5 w-5 text-emerald-500" />
                  <div>
                    <div className="font-semibold text-[#0A1A2F]">Role-based access</div>
                    <div className="text-sm text-[#4B5A6A]">Server-side authorization gates</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-[#0A1A2F] p-6 text-white sm:p-8">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="relative z-10">
                <div className="mb-4 flex items-center gap-2">
                  <Shield className="h-6 w-6 text-emerald-400" />
                  <span className="text-lg font-bold">Data Isolation Model</span>
                </div>
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-semibold text-emerald-300">Academy A</div>
                    <div className="mt-1 text-xs text-gray-400">Users - Classes - Finance - Docs</div>
                    <div className="mt-2 h-1 w-full rounded-full bg-white/10">
                      <div className="h-full w-3/4 rounded-full bg-emerald-500" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-semibold text-blue-300">Academy B</div>
                    <div className="mt-1 text-xs text-gray-400">Users - Classes - Finance - Docs</div>
                    <div className="mt-2 h-1 w-full rounded-full bg-white/10">
                      <div className="h-full w-1/2 rounded-full bg-blue-500" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
                    <Lock className="h-3.5 w-3.5" /> Complete data isolation between academies
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-[#F5FBF8] py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-[#0A1A2F] sm:text-4xl">
              Start small, then run the whole academy from one place.
            </h2>
            <p className="mt-3 text-[#4B5A6A]">
              A clean setup flow helps you move from registration to daily operations without
              overwhelming your team.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workflowSteps.map((item, index) => (
              <div key={item.step} className="relative rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-2 text-3xl font-bold text-emerald-200">{item.step}</div>
                <h3 className="font-bold text-[#0A1A2F]">{item.title}</h3>
                <p className="mt-1 text-sm text-[#4B5A6A]">{item.description}</p>
                {index < workflowSteps.length - 1 && (
                  <ChevronRight className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 rounded-full bg-white text-emerald-300 shadow-sm lg:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-[#0A1A2F] p-8 text-center text-white shadow-2xl sm:p-12">
            <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-br from-emerald-500/10 to-teal-500/5" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold sm:text-4xl">Ready to bring calm to your academy?</h2>
              <p className="mx-auto mt-3 max-w-lg text-gray-300">
                Start with a clean academy workspace, then add people, classes, reports, fees, and
                notifications as your operations grow.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href={createAcademyHref}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3.5 font-semibold text-white shadow-lg transition-all hover:bg-emerald-400"
                >
                  Create Academy <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={loginHref}
                  className="rounded-xl border border-white/20 bg-white/10 px-8 py-3.5 font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  Open Login
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> Secure setup
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> Real workflows
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> Role-ready
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-[#4B5A6A]">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-3 flex items-center justify-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-[#0A1A2F]">AcademyFlow</span>
          </div>
          <p>&copy; {new Date().getFullYear()} AcademyFlow. Built for calm, control, and clarity.</p>
        </div>
      </footer>
    </div>
  )
}
