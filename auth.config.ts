import type { NextAuthConfig } from "next-auth";

// Edge-safe auth config — NO imports from lib/db or any Node.js-only modules.
// Used by middleware.ts which runs in the Edge Runtime.
export const authConfig = {
  pages: {
    signIn: "/inloggen",
    error: "/inloggen",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtectedRoute =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/organisaties") ||
        nextUrl.pathname.startsWith("/teams") ||
        nextUrl.pathname.startsWith("/medewerkers") ||
        nextUrl.pathname.startsWith("/financiering") ||
        nextUrl.pathname.startsWith("/instellingen");

      if (isProtectedRoute && !isLoggedIn) {
        const loginUrl = new URL("/inloggen", nextUrl.origin);
        loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
        return Response.redirect(loginUrl);
      }

      return true;
    },
  },
  providers: [], // providers are added in lib/auth/index.ts — not needed here
} satisfies NextAuthConfig;
