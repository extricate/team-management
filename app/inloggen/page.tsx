import { redirect } from "next/navigation";
import { Button, Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth, signIn } from "@/lib/auth";
import DevLoginButton from "./dev-login-button";

interface SearchParams { error?: string; callbackUrl?: string; }

const errorMessages: Record<string, string> = {
  OAuthSignin:        "Er is een fout opgetreden bij het inloggen. Probeer het opnieuw.",
  OAuthCallback:      "Er is een fout opgetreden bij het verwerken van uw inlogpoging.",
  Default:            "Er is een onbekende fout opgetreden.",
};

export default async function InloggenPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (session?.user) redirect(searchParams.callbackUrl ?? "/dashboard");

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
          await signIn("resend", { email: formData.get("email") as string, redirectTo: searchParams.callbackUrl ?? "/dashboard" });
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

      {process.env.NODE_ENV === "development" && (
        <div style={{ borderTop: "1px solid var(--rvo-color-grijs-300)", paddingTop: "1.5rem", marginTop: "1.5rem" }}>
          <Paragraph style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)" }}>
            
          </Paragraph>
          <DevLoginButton callbackUrl={searchParams.callbackUrl}>⚠️ Dev mode</DevLoginButton>
        </div>
      )}
    </div>
  );
}
