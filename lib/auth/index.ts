import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { authConfig } from "@/auth.config";

// No email provider — auth is handled by server actions using credentials + TOTP.
// NextAuth is kept only for session management (auth(), signOut(), session cookie).
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users as any,
    accountsTable: accounts as any,
    sessionsTable: sessions as any,
    verificationTokensTable: verificationTokens as any,
  }),
  providers: [],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role ?? "viewer";
      session.user.organisationId = user.organisationId ?? null;
      session.user.defaultOrganisationId = user.defaultOrganisationId ?? null;
      return session;
    },
  },
});
