import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { employees, organisations, medewerkerFuncties, functies } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { MedewerkerEditForm } from "./EditForm";
import { buildEntityMetadata } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const emp = await db.query.employees.findFirst({ where: and(eq(employees.id, id), isNull(employees.deletedAt)) });
  return buildEntityMetadata(emp ? `${emp.firstName} ${emp.lastName} bewerken` : undefined, "Medewerker bewerken");
}

export default async function MedewerkerBewerkenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const [emp, allOrgs, primaryFunctieRows] = await Promise.all([
    db.query.employees.findFirst({
      where: and(eq(employees.id, id), isNull(employees.deletedAt)),
    }),
    db.select({ id: organisations.id, name: organisations.name })
      .from(organisations)
      .where(isNull(organisations.deletedAt))
      .orderBy(organisations.name),
    db
      .select({ assignment: medewerkerFuncties, functie: functies })
      .from(medewerkerFuncties)
      .innerJoin(functies, eq(medewerkerFuncties.functieId, functies.id))
      .where(and(eq(medewerkerFuncties.employeeId, id), eq(medewerkerFuncties.isPrimary, true), isNull(medewerkerFuncties.endDate))),
  ]);

  if (!emp) notFound();

  const primaryFunctie = primaryFunctieRows[0] ?? null;

  return (
    <>
      <MedewerkerEditForm emp={emp} orgs={allOrgs} />

      {/* Primary functie info block */}
      <div style={{ marginTop: "2rem", padding: "1rem", border: "1px solid var(--rvo-color-grijs-300)", borderRadius: "4px" }}>
        <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>Primaire functie</p>
        {primaryFunctie ? (
          <p style={{ margin: "0 0 0.75rem", color: "var(--rvo-color-grijs-700)" }}>
            {primaryFunctie.functie.titel}
            {primaryFunctie.functie.schaalCode && <span style={{ marginLeft: "0.5rem", color: "var(--rvo-color-grijs-600)" }}>· Schaal {primaryFunctie.functie.schaalCode}</span>}
          </p>
        ) : (
          <p style={{ margin: "0 0 0.75rem", color: "var(--rvo-color-grijs-600)" }}>Nog geen primaire functie ingesteld.</p>
        )}
        <Link href={`/medewerkers/${id}/functies/toevoegen`} className="utrecht-link" style={{ fontSize: "0.875rem" }}>
          {primaryFunctie ? "Andere primaire functie toevoegen" : "Primaire functie toevoegen"}
        </Link>
      </div>
    </>
  );
}
