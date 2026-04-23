import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { getRoleRedirectPath } from "@/lib/role-redirect"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname
    const academyIsDeleted = token?.academy?.isDeleted === true

    if (
      token &&
      academyIsDeleted &&
      (path === "/" ||
        path.startsWith("/admin") ||
        path.startsWith("/teacher") ||
        path.startsWith("/student") ||
        path.startsWith("/parent") ||
        path.startsWith("/notifications") ||
        path.startsWith("/login") ||
        path.startsWith("/register"))
    ) {
      return NextResponse.redirect(new URL("/academy-deactivated", req.url))
    }

    // Redirect authenticated users away from auth pages
    if (token && path.startsWith("/login")) {
      return NextResponse.redirect(new URL(getRoleRedirectPath(token.role as string | undefined), req.url))
    }

    if (token && path.startsWith("/register")) {
      return NextResponse.redirect(new URL(getRoleRedirectPath(token.role as string | undefined), req.url))
    }

    // Protect dashboard routes
    if (!token && path.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    if (!token && path.startsWith("/teacher")) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    if (!token && path.startsWith("/student")) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    if (!token && path.startsWith("/parent")) {
      return NextResponse.redirect(new URL("/login", req.url))
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
    "/teacher/:path*",
    "/student/:path*",
    "/parent/:path*",
    "/notifications",
  ],
}
