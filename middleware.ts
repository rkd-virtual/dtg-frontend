// frontend/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 🚫 NEVER protect API routes
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Only protect portal routes
  if (!pathname.startsWith("/portal")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("access_token_cookie")?.value;

  if (token) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/log-in", req.nextUrl.origin);
  loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/portal/:path*"],
};
