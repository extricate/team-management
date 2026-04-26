import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import GitHub from "next-auth/providers/github";
import Resend from "next-auth/providers/resend";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { authConfig } from "@/auth.config";
import Nodemailer from "next-auth/providers/nodemailer";

function getEmailProvider() {
  const hasSMTP =
    process.env.SMTP_HOST && process.env.SMTP_PORT;

  if (hasSMTP) {
    return Nodemailer({
      server: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: false,
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
      },
      from: process.env.SMTP_FROM,
    });
  }

  return Resend({
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.SMTP_FROM,
  });
}

// Full config — extends the edge-safe config with the DB adapter and providers.
// Only imported in server components and API routes (Node.js runtime).
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users as any,
    accountsTable: accounts as any,
    sessionsTable: sessions as any,
    verificationTokensTable: verificationTokens as any,
  }),
  providers: [
    getEmailProvider(),
    GitHub,
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
