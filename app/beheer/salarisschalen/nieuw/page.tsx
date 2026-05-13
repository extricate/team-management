import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NieuwSalarisSchaalForm } from "./NieuwSalarisSchaalForm";

export const metadata = { title: "Nieuwe salarisschaal – Teambeheer" };

export default async function NieuwSalarisSchaalPage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen?callbackUrl=/beheer/salarisschalen/nieuw");
  if (session.user.role !== "admin") redirect("/dashboard");

  return <NieuwSalarisSchaalForm />;
}
