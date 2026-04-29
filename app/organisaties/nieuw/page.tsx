import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NieuweOrganisatieForm } from "./NieuweOrganisatieForm";

export const metadata: Metadata = { title: "Nieuwe organisatie – Teambeheer" };

export default async function NieuweOrganisatiePage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  return <NieuweOrganisatieForm />;
}
