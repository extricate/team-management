import type { NextAuthConfig } from "next-auth";

// Shared config consumed by lib/auth/index.ts (Node.js runtime, has DB adapter).
// The middleware no longer uses NextAuth directly — see middleware.ts.
export const authConfig = {
  pages: {
    signIn: "/inloggen",
    error: "/inloggen",
  },
  providers: [],
} satisfies NextAuthConfig;
