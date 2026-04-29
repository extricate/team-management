import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BulkImportForm } from "./BulkImportForm";

export const metadata: Metadata = { title: "Bulk importeren – Teambeheer" };

export default async function BulkImportPage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");
  return <BulkImportForm />;
}
