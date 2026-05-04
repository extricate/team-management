import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { devSignIn } from "./actions";
import { PasswordLoginForm } from "./PasswordLoginForm";
import { TotpLoginForm } from "./TotpLoginForm";

export const metadata: Metadata = { title: "Inloggen – Teambeheer" };

interface SearchParams { stap?: string; callbackUrl?: string; fout?: string }

function sanitizeRedirect(url?: string): string {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url;
  return "/dashboard";
}

const sessionErrors: Record<string, string> = {
  "sessie-verlopen": "Uw inlogsessie is verlopen. Probeer opnieuw in te loggen.",
};

export default async function InloggenPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  const { stap, callbackUrl, fout } = await searchParams;
  if (session?.user) redirect(sanitizeRedirect(callbackUrl));

  const isTotpStep = stap === "totp";
  const sessionError = fout ? (sessionErrors[fout] ?? "Er is een fout opgetreden.") : null;

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto" }}>
      <Heading level={1}>Inloggen</Heading>

      {!isTotpStep && (
        <Paragraph>Log in om toegang te krijgen tot Teambeheer.</Paragraph>
      )}

      {isTotpStep && (
        <Paragraph>Voer uw twee-factor verificatiecode in.</Paragraph>
      )}

      {sessionError && (
        <div role="alert" style={{ padding: "1rem", marginBottom: "1.5rem", borderLeft: "4px solid var(--rvo-color-rood-600)", background: "var(--rvo-color-rood-100)" }}>
          <Paragraph style={{ margin: 0 }}>{sessionError}</Paragraph>
        </div>
      )}

      {isTotpStep
        ? <TotpLoginForm callbackUrl={callbackUrl} />
        : <PasswordLoginForm callbackUrl={callbackUrl} />
      }

      {process.env.NODE_ENV === "development" && !isTotpStep && (
        <form action={devSignIn} style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid var(--rvo-color-grijs-300)" }}>
          <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/dashboard"} />
          <button type="submit" className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.85em" }}>
            Dev: direct inloggen als admin
          </button>
        </form>
      )}
    </div>
  );
}
