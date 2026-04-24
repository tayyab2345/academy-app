export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,#f8fbff_0%,#f3f6ff_46%,#eef4ff_100%)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-28 top-20 h-72 w-72 rounded-full border border-white/60 bg-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl" />
        <div className="absolute -right-24 bottom-20 h-80 w-80 rounded-full border border-white/60 bg-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl" />
        <div className="absolute left-8 bottom-24 grid grid-cols-4 gap-4 opacity-40 sm:left-12">
          {Array.from({ length: 16 }).map((_, index) => (
            <span
              key={index}
              className="h-2 w-2 rounded-full bg-indigo-200"
            />
          ))}
        </div>
        <div className="absolute right-10 top-24 grid grid-cols-4 gap-4 opacity-45 sm:right-16">
          {Array.from({ length: 16 }).map((_, index) => (
            <span
              key={`top-${index}`}
              className="h-2 w-2 rounded-full bg-indigo-200"
            />
          ))}
        </div>
      </div>

      <div className="relative flex min-h-screen flex-col">
        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>

        <footer className="relative px-4 pb-6 text-center text-sm text-slate-500 sm:px-6">
          <p>&copy; {new Date().getFullYear()} AcademyFlow. All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}
