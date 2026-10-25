import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/server/session";

/**
 * Optimistic gate: unauthenticated visitors are sent to /login (pages) or get 401 (API).
 * Route handlers verify the session again before touching data.
 */
export async function proxy(req: NextRequest) {
  const secret = process.env.AUTH_SECRET ?? "";
  const session = secret ? await verifySession(req.cookies.get(SESSION_COOKIE)?.value, secret) : null;
  const { pathname, search } = req.nextUrl;

  if (pathname === "/login") {
    return session ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  }
  if (session) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return Response.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  const login = new URL("/login", req.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|api/auth/login|api/auth/logout).*)"],
};
