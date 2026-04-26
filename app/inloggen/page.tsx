import { redirect } from "next/navigation";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth, signIn } from "@/lib/auth";
import { devSignIn } from "./actions";

interface SearchParams { error?: string; callbackUrl?: string; }

const errorMessages: Record<string, string> = {
  OAuthSignin:   "Er is een fout opgetreden bij het inloggen. Probeer het opnieuw.",
  OAuthCallback: "Er is een fout opgetreden bij het verwerken van uw inlogpoging.",
  Default:       "Er is een onbekende fout opgetreden.",
};

function sanitizeRedirect(url?: string): string {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url;
  return "/dashboard";
}

export default async function InloggenPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (session?.user) redirect(sanitizeRedirect(searchParams.callbackUrl));

  const errorMessage = searchParams.error
    ? (errorMessages[searchParams.error] ?? errorMessages.Default)
    : null;

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto" }}>
      <Heading level={1}>Inloggen</Heading>
      <Paragraph>Log in om toegang te krijgen tot Teambeheer.</Paragraph>

      {errorMessage && (
        <div role="alert" style={{ padding: "1rem", marginBottom: "1.5rem", borderLeft: "4px solid var(--rvo-color-rood-600)", background: "var(--rvo-color-rood-100)" }}>
          <Paragraph style={{ margin: 0 }}>{errorMessage}</Paragraph>
        </div>
      )}

      <form
        action={async (formData: FormData) => {
          "use server";
          await signIn("resend", { email: formData.get("email") as string, redirectTo: sanitizeRedirect(searchParams.callbackUrl) });
        }}
        style={{ marginBottom: "2rem" }}
      >
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="email" className="utrecht-form-label">E-mailadres</label>
          <input id="email" name="email" type="email" required autoComplete="email"
            className="utrecht-textbox" style={{ display: "block", width: "100%", marginTop: "0.5rem" }}
            placeholder="naam@organisatie.nl" />
        </div>
        <button type="submit" className="utrecht-button utrecht-button--primary-action">
          Stuur inloglink
        </button>
      </form>
    </div>
  );
}
