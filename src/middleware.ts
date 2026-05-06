import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import {
  getRoleRedirectPath,
  hasUsableDashboardIdentity,
} from "@/lib/role-redirect"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname
    const isDashboardPath =
      path.startsWith("/admin") ||
      path.startsWith("/teacher") ||
      path.startsWith("/student") ||
      path.startsWith("/parent") ||
      path.startsWith("/notifications")
    const hasDashboardIdentity = hasUsableDashboardIdentity(token)
    const academyIsDeleted = token?.academy?.isDeleted === true

    if (
      token &&
      hasDashboardIdentity &&
      academyIsDeleted &&
      (path === "/" ||
        isDashboardPath ||
        path.startsWith("/login") ||
        path.startsWith("/register"))
    ) {
      return NextResponse.redirect(new URL("/academy-deactivated", req.url))
    }

    // Redirect authenticated users away from public/auth pages before they render.
    if (token && hasDashboardIdentity && path === "/") {
      return NextResponse.redirect(new URL(getRoleRedirectPath(token.role), req.url))
    }

    if (token && hasDashboardIdentity && path.startsWith("/login")) {
      return NextResponse.redirect(new URL(getRoleRedirectPath(token.role), req.url))
    }

    if (token && hasDashboardIdentity && path.startsWith("/register")) {
      return NextResponse.redirect(new URL(getRoleRedirectPath(token.role), req.url))
    }

    // Protect dashboard routes
    if (!token && isDashboardPath) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    if (token && !hasDashboardIdentity && isDashboardPath) {
      return NextResponse.redirect(new URL("/login?auth=retry", req.url))
    }

    return NextResponse.next()
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname

        // Public routes - no token required
        if (
          path === "/" ||
          path.startsWith("/academy-deactivated") ||
          path.startsWith("/login") ||
          path.startsWith("/register") ||
          path.startsWith("/api/register")
        ) {
          return true
        }

        // Protected routes - token required
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    "/admin/:path*",
    "/",
    "/teacher/:path*",
    "/student/:path*",
    "/parent/:path*",
    "/notifications",
  ],
}
