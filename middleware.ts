import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = (req.nextauth.token as any)?.role;

    // Admin-only section — borrowers get redirected back to their dashboard.
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

// Protect everything except the public auth pages, static assets and API routes.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/loans/:path*",
    "/calculator/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};
