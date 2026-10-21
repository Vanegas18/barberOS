import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "bo_session";

const GUEST_ONLY = ["/ingresar", "/registro"];

const PUBLIC = [/^\/[^/]+\/reservar(\/|$)/];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (PUBLIC.some((re) => re.test(pathname))) return NextResponse.next();

  if (matches(pathname, GUEST_ONLY)) {
    return hasSession
      ? NextResponse.redirect(new URL("/inicio", request.url))
      : NextResponse.next();
  }

  if (!hasSession) return NextResponse.redirect(new URL("/ingresar", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|.*\\..*).*)"],
};
