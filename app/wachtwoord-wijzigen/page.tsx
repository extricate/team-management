import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { WachtwoordWijzigenForm } from "./WachtwoordWijzigenForm";

export const metadata: Metadata = { title: "Wachtwoord instellen – Teambeheer" };

interface SearchParams { callbackUrl?: string }

export default async function WachtwoordWijzigenPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");
  if (!session.user.mustChangePassword) redirect("/dashboard");

  const { callbackUrl } = await searchParams;

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto" }}>
      <Heading level={1}>Wachtwoord instellen</Heading>
      <Paragraph>
        Uw account heeft een tijdelijk wachtwoord. Stel een nieuw wachtwoord in om verder te gaan.
      </Paragraph>
      <WachtwoordWijzigenForm callbackUrl={callbackUrl} />
    </div>
  );
}
