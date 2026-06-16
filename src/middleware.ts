import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow API routes and auth pages without checking
  if (pathname.startsWith("/api/") || pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  // For all other pages (dashboard, generate, etc.), check for auth cookie.
  // Supabase stores session in localStorage, so middleware can't reliably
  // detect auth. Client-side auth guards handle the actual redirect.
  // We only do a best-effort cookie check here.
  const supabaseToken = request.cookies
    .getAll()
    .find((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  // If no cookie found and not on login page, let it through.
  // Client-side auth check will redirect if needed.
  if (!supabaseToken && pathname !== "/") {
    // Let client-side handle it - don't redirect here
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
