import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { employees, functies } from "@/lib/db/schema";
import { eq, isNull, and, asc } from "drizzle-orm";
import { formatFullName } from "@/lib/utils";
import { AddFunctieForm } from "./AddFunctieForm";

export const metadata = { title: "Functie toevoegen – Teambeheer" };

export default async function AddFunctiePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const [emp, allFuncties] = await Promise.all([
    db.query.employees.findFirst({ where: and(eq(employees.id, id), isNull(employees.deletedAt)) }),
    db
      .select({ id: functies.id, titel: functies.titel })
      .from(functies)
      .where(and(eq(functies.isActive, true), isNull(functies.deletedAt)))
      .orderBy(asc(functies.titel)),
  ]);

  if (!emp) notFound();

  return (
    <AddFunctieForm
      employeeId={id}
      employeeName={formatFullName(emp)}
      functies={allFuncties}
    />
  );
}
