import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-next";

const SESSION_COOKIE = "bo_session";

const GUEST_ONLY = ["/ingresar", "/registro"];

const PUBLIC = [/^\/[^/]+\/reservar(\/|$)/, /^\/invitacion\/[^/]+$/];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (PUBLIC.some((re) => re.test(pathname))) return NextResponse.next();

  if (matches(pathname, GUEST_ONLY)) {
    if (!hasSession) return NextResponse.next();
    return NextResponse.redirect(new URL(safeNext(searchParams.get("next")), request.url));
  }

  if (!hasSession) {
    const login = new URL("/ingresar", request.url);
    const next = `${pathname}${search}`;
    if (next !== "/" && next !== "/inicio") login.searchParams.set("next", next);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|.*\\..*).*)"],
};
