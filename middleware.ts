import { type NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/organisaties",
  "/teams",
  "/medewerkers",
  "/financiering",
  "/instellingen",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // NextAuth v5 with a database adapter issues opaque UUID session tokens, not
  // JWTs. Running the full NextAuth middleware here would cause it to attempt
  // JWT decode, fail, and emit `Set-Cookie: authjs.session-token=; maxAge=0`
  // on every response — silently wiping the valid session cookie each request.
  // Instead we do a lightweight cookie-presence check; the page-level auth()
  // call (which has the real DB adapter) performs the actual session validation.
  const hasSession =
    !!request.cookies.get("authjs.session-token")?.value ||
    !!request.cookies.get("__Secure-authjs.session-token")?.value;

  if (!hasSession) {
    const loginUrl = new URL("/inloggen", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
