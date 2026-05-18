import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { functies, medewerkerFuncties, employees } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { formatFullName } from "@/lib/utils";
import { NIET_BESCHIKBAAR_TITEL } from "@/lib/functies";

export default async function FunctieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");
  if (session.user.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const [functie] = await db.select().from(functies).where(eq(functies.id, id));
  if (!functie || functie.deletedAt) notFound();

  const medewerkers = await db
    .select({ assignment: medewerkerFuncties, employee: employees })
    .from(medewerkerFuncties)
    .innerJoin(employees, eq(medewerkerFuncties.employeeId, employees.id))
    .where(and(eq(medewerkerFuncties.functieId, id), isNull(employees.deletedAt)))
    .orderBy(medewerkerFuncties.status, employees.lastName);

  const isSentinel = functie.titel === NIET_BESCHIKBAAR_TITEL;

  return (
    <div>
      <Breadcrumbs crumbs={[
        { label: "Beheer", href: "/beheer/salarisschalen" },
        { label: "Functies", href: "/beheer/functies" },
        { label: functie.titel },
      ]} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <Heading level={1} style={{ margin: 0 }}>{functie.titel}</Heading>
          <p style={{ color: functie.isActive ? "var(--rvo-color-groen-600)" : "var(--rvo-color-grijs-600)", marginTop: "0.25rem" }}>
            {functie.isActive ? "Actief" : "Inactief"}
            {functie.schaalCode && ` · Schaal ${functie.schaalCode}`}
          </p>
        </div>
        {!isSentinel && (
          <Link href={`/beheer/functies/${id}/bewerken`} className="utrecht-button utrecht-button--secondary-action">
            Bewerken
          </Link>
        )}
      </div>

      <Heading level={2} style={{ marginBottom: "1rem" }}>
        Medewerkers met deze functie ({medewerkers.length})
      </Heading>

      {medewerkers.length === 0 ? (
        <p style={{ color: "var(--rvo-color-grijs-600)" }}>Geen medewerkers hebben deze functie (momenteel) toegewezen.</p>
      ) : (
        <table className="utrecht-table">
          <thead className="utrecht-table__header">
            <tr className="utrecht-table__row">
              <th className="utrecht-table__header-cell">Naam</th>
              <th className="utrecht-table__header-cell">Primair</th>
              <th className="utrecht-table__header-cell">Startdatum</th>
              <th className="utrecht-table__header-cell">Einddatum</th>
              <th className="utrecht-table__header-cell">Status</th>
            </tr>
          </thead>
          <tbody className="utrecht-table__body">
            {medewerkers.map(({ assignment, employee }) => (
              <tr key={assignment.id} className="utrecht-table__row">
                <td className="utrecht-table__cell">
                  <Link href={`/medewerkers/${employee.id}`} className="utrecht-link">
                    {formatFullName(employee)}
                  </Link>
                </td>
                <td className="utrecht-table__cell">
                  {assignment.isPrimary ? (
                    <span style={{ fontWeight: 600, color: "var(--rvo-color-hemelblauw-700)" }}>Primair</span>
                  ) : "—"}
                </td>
                <td className="utrecht-table__cell">
                  {assignment.startDate ? new Date(assignment.startDate).toLocaleDateString("nl-NL") : "—"}
                </td>
                <td className="utrecht-table__cell">
                  {assignment.endDate ? new Date(assignment.endDate).toLocaleDateString("nl-NL") : "—"}
                </td>
                <td className="utrecht-table__cell">
                  <span style={{ color: assignment.status === "active" ? "var(--rvo-color-groen-600)" : "var(--rvo-color-grijs-600)" }}>
                    {assignment.status === "active" ? "Actief" : "Beëindigd"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
