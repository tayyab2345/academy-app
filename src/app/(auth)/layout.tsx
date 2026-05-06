export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-muted/10">
      <div className="flex min-h-screen flex-col">
        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>

        <footer className="border-t bg-background px-4 py-4 text-center text-sm text-muted-foreground sm:px-6">
          <p>&copy; {new Date().getFullYear()} AcademyFlow. All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}
