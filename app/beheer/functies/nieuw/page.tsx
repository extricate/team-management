import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NieuweFunctieForm } from "./NieuweFunctieForm";

export const metadata = { title: "Nieuwe functie – Teambeheer" };

export default async function NieuweFunctiePage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen?callbackUrl=/beheer/functies/nieuw");
  if (session.user.role !== "admin") redirect("/dashboard");

  return <NieuweFunctieForm />;
}
