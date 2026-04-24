import { Metadata } from "next"
import Link from "next/link"
import {
  BarChart3,
  GraduationCap,
  Landmark,
  PlayCircle,
  Rocket,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react"
import { RegisterAcademyForm } from "@/components/auth/register-academy-form"

export const metadata: Metadata = {
  title: "Register Your Academy - AcademyFlow",
  description: "Create your academy and admin account",
}

const featureItems = [
  {
    title: "Launch in minutes",
    description: "Get your academy up and running in just a few guided steps.",
    icon: Rocket,
  },
  {
    title: "Built for educators",
    description: "Everything you need to teach, engage, and grow from one workspace.",
    icon: Users,
  },
  {
    title: "Scale without limits",
    description: "From one batch to a full institution, your workflows stay organized.",
    icon: BarChart3,
  },
  {
    title: "Secure and reliable",
    description: "Enterprise-grade protection and role-based access for peace of mind.",
    icon: ShieldCheck,
  },
]

export default function RegisterAcademyPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[1550px] items-center justify-center py-6 sm:py-10">
      <div className="w-full rounded-[2rem] border border-white/70 bg-white/38 p-4 shadow-[0_40px_120px_-36px_rgba(99,102,241,0.3)] backdrop-blur-xl sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#34d399_0%,#4f46e5_100%)] p-2.5 shadow-[0_20px_40px_-22px_rgba(79,70,229,0.6)]">
              <img
                src="/icons/app-icon.svg"
                alt="AcademyFlow"
                className="h-full w-full rounded-xl object-contain"
              />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-950">
              AcademyFlow
            </span>
          </Link>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/80 bg-white/70 px-4 py-2 text-sm text-slate-600 shadow-sm">
            <span>Already have an account?</span>
            <Link href="/login" className="font-semibold text-indigo-600 transition hover:text-indigo-700">
              Sign in
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
          <section className="px-2 py-2 lg:px-6">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1fr] lg:items-start">
              <div className="space-y-8">
                <div className="space-y-5">
                  <h1 className="max-w-xl text-5xl font-bold leading-[0.96] tracking-tight text-slate-950 sm:text-6xl xl:text-7xl">
                    Build an academy
                    <br />
                    that{" "}
                    <span className="bg-[linear-gradient(90deg,#2563eb_0%,#7c3aed_100%)] bg-clip-text text-transparent">
                      inspires.
                    </span>
                  </h1>
                  <p className="max-w-lg text-lg leading-8 text-slate-600 sm:text-[1.45rem]">
                    Create your academy and start delivering exceptional learning experiences.
                  </p>
                </div>

                <div className="grid gap-5">
                  {featureItems.map((item) => (
                    <div key={item.title} className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.35rem] border border-white/80 bg-white/78 text-indigo-500 shadow-[0_18px_40px_-26px_rgba(79,70,229,0.35)] backdrop-blur">
                        <item.icon className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xl font-semibold text-slate-900">
                          {item.title}
                        </p>
                        <p className="max-w-sm text-base leading-7 text-slate-600">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-[560px] pt-4 lg:pt-16">
                <AcademyHeroVisual />
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-4 rounded-[1.7rem] border border-white/75 bg-white/72 p-5 shadow-[0_24px_60px_-32px_rgba(79,70,229,0.28)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex -space-x-3">
                {["AF", "QA", "ED", "MS"].map((label, index) => (
                  <div
                    key={label}
                    className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white text-sm font-semibold text-slate-700 shadow-sm"
                    style={{
                      background:
                        index % 2 === 0
                          ? "linear-gradient(145deg,#ffffff 0%,#dbeafe 100%)"
                          : "linear-gradient(145deg,#ffffff 0%,#e9d5ff 100%)",
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div className="space-y-2 sm:flex-1 sm:pl-5">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-5 w-5 fill-current" />
                  ))}
                  <span className="ml-2 text-base font-semibold text-slate-800">4.9/5</span>
                </div>
                <p className="text-lg font-medium text-slate-800">
                  Trusted by 1000+ academies worldwide
                </p>
              </div>
            </div>
          </section>

          <div className="xl:pl-4">
            <RegisterAcademyForm />
          </div>
        </div>
      </div>
    </div>
  )
}

function AcademyHeroVisual() {
  return (
    <div className="relative min-h-[360px]">
      <div className="absolute inset-x-10 bottom-0 h-28 rounded-full bg-[radial-gradient(circle,_rgba(99,102,241,0.34)_0%,_rgba(191,219,254,0.08)_60%,_transparent_78%)] blur-2xl" />
      <div className="absolute left-10 right-10 bottom-2 h-10 rounded-full border border-white/50 bg-white/35 backdrop-blur-md" />
      <div className="absolute left-16 right-16 bottom-10 h-12 rounded-full border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(224,231,255,0.52)_100%)] shadow-[0_20px_50px_-24px_rgba(79,70,229,0.4)] backdrop-blur-xl" />
      <div className="absolute left-24 right-24 bottom-20 h-14 rounded-full border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.85)_0%,rgba(224,231,255,0.62)_100%)] shadow-[0_28px_60px_-26px_rgba(79,70,229,0.42)] backdrop-blur-xl" />

      <div className="absolute left-1/2 top-[5%] h-20 w-20 -translate-x-1/2 rounded-full border border-white/70 bg-white/40 shadow-[0_20px_50px_-24px_rgba(99,102,241,0.4)] backdrop-blur-md" />
      <div className="absolute left-[14%] top-[48%] h-8 w-8 rounded-full border border-white/70 bg-white/45 shadow-[0_10px_30px_-18px_rgba(79,70,229,0.35)] backdrop-blur-md" />
      <div className="absolute right-[14%] top-[24%] h-10 w-10 rounded-full border border-white/70 bg-white/45 shadow-[0_10px_30px_-18px_rgba(79,70,229,0.35)] backdrop-blur-md" />

      <div className="absolute right-[4%] top-[24%] rotate-[14deg] rounded-[1.8rem] border border-white/70 bg-[linear-gradient(180deg,rgba(124,58,237,0.88)_0%,rgba(99,102,241,0.82)_100%)] p-5 text-white shadow-[0_30px_65px_-26px_rgba(79,70,229,0.62)]">
        <PlayCircle className="h-8 w-8" />
      </div>

      <div className="absolute right-[2%] top-[56%] rounded-[1.7rem] border border-cyan-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(224,231,255,0.72)_100%)] p-4 shadow-[0_28px_60px_-28px_rgba(14,165,233,0.36)] backdrop-blur-xl">
        <BarChart3 className="h-10 w-10 text-cyan-500" />
      </div>

      <div className="absolute left-[10%] top-[58%] rounded-[1.7rem] border border-white/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.9)_0%,rgba(51,65,85,0.92)_100%)] p-4 text-amber-300 shadow-[0_28px_60px_-30px_rgba(15,23,42,0.65)]">
        <GraduationCap className="h-10 w-10" />
      </div>

      <div className="absolute left-1/2 top-[22%] w-[58%] -translate-x-1/2 rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(238,242,255,0.86)_100%)] p-7 shadow-[0_40px_90px_-36px_rgba(99,102,241,0.48)] backdrop-blur-xl">
        <div className="absolute left-1/2 top-[-2.8rem] flex -translate-x-1/2 flex-col items-center">
          <div className="h-10 w-1 rounded-full bg-[linear-gradient(180deg,#c4b5fd_0%,#8b5cf6_100%)]" />
          <div className="mt-1 rounded-xl bg-[linear-gradient(90deg,#8b5cf6_0%,#6366f1_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_30px_-18px_rgba(99,102,241,0.6)]">
            AF
          </div>
        </div>

        <div className="flex h-52 items-center justify-center rounded-[1.6rem] bg-[radial-gradient(circle_at_top,_rgba(224,231,255,0.95),_rgba(255,255,255,0.74)_70%)]">
          <Landmark className="h-28 w-28 text-indigo-400" strokeWidth={1.6} />
        </div>
      </div>
    </div>
  )
}
