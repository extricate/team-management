import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Use only the edge-safe config here — no DB, no Node.js APIs.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
