import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user;
  const isProtectedRoute =
    req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/teams") ||
    req.nextUrl.pathname.startsWith("/medewerkers") ||
    req.nextUrl.pathname.startsWith("/instellingen");

  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/inloggen", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
