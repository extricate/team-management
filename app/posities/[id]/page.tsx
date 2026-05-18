import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Heading, Paragraph, DataSummary, DataSummaryItem } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { positions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchDetailSidebar } from "@/lib/loaders/detail";
import { CommentSection } from "@/components/ui/CommentSection";
import { AuditLog } from "@/components/ui/AuditLog";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ArchiveButton } from "@/components/ui/ArchiveButton";
import { ArchivedBanner } from "@/components/ui/ArchivedBanner";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { formatDate, formatCurrency, buildEntityMetadata } from "@/lib/utils";
import { getOPFType } from "@/lib/opf-types";
import { getPositionTitel } from "@/lib/functies";

const STATUS_LABELS: Record<string, string> = {
  gepland: "Gepland",
  gewenst: "Gewenst",
  toegezegd: "Toegezegd",
  open: "Open (vacature)",
  gevuld: "Bezet",
  gesloten: "Gesloten",
};

const STATUS_COLORS: Record<string, "green" | "orange" | "blue" | "grey"> = {
  gevuld: "green",
  open: "orange",
  toegezegd: "blue",
  gepland: "grey",
  gewenst: "grey",
  gesloten: "grey",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await db.query.positions.findFirst({
    where: eq(positions.id, id),
    with: { functie: { columns: { titel: true } } },
  });
  return buildEntityMetadata(row ? getPositionTitel(row) : undefined, "Positie");
}

export default async function PositieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const row = await db.query.positions.findFirst({
    where: eq(positions.id, id),
    with: {
      functie: { columns: { titel: true } },
      organisation: true,
      teamCouplings: {
        with: { team: { with: { organisation: true } } },
        orderBy: (c, { desc: d }) => [d(c.createdAt)],
      },
      fundingAllocations: {
        with: { financialSourceAmount: { with: { financialSource: true, type: true } } },
      },
      assignments: {
        with: { employee: true },
        orderBy: (a, { desc: d }) => [d(a.startDate)],
      },
      bestelling: true,
    },
  });

  if (!row) notFound();
  if (row.deletedAt) {
    // still show archived positions
  }

  const isArchived = !!row.deletedAt;

  const activeCoupling = row.teamCouplings.find(c => !c.endDate) ?? null;

  const { comments: rowComments, audit } = await fetchDetailSidebar("position", id);

  const opfDef = getOPFType(row.opfType ?? "");
  const activeAssignment = row.assignments.find(a => a.status === "active");
  const positieTitel = getPositionTitel(row);

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: "Posities", href: "/posities" }, { label: positieTitel }]} />

      {isArchived && <ArchivedBanner deletedAt={row.deletedAt!} entityLabel={positieTitel} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <Heading level={1} style={{ margin: 0 }}>{positieTitel}</Heading>
            <StatusBadge label={STATUS_LABELS[row.status] ?? row.status} color={STATUS_COLORS[row.status] ?? "grey"} />
          </div>
          <Paragraph style={{ margin: 0, color: "var(--rvo-color-grijs-600)" }}>
            {row.organisation.name}
            {activeCoupling?.team && (
              <> · <Link href={`/teams/${activeCoupling.team.id}`} className="utrecht-link">{activeCoupling.team.name}</Link></>
            )}
          </Paragraph>
        </div>
        {!isArchived && (
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Link href={`/posities/${id}/bewerken`} className="utrecht-button utrecht-button--secondary-action">Bewerken</Link>
            <ArchiveButton entityName={positieTitel} apiPath={`/api/positions/${id}`} redirectTo="/posities" />
          </div>
        )}
      </div>

      {/* Metadata */}
      <DataSummary appearance="row" style={{ marginBottom: "2rem" }}>
        <DataSummaryItem itemKey="Organisatie" itemValue={row.organisation.name} />
        {row.positionCode && <DataSummaryItem itemKey="Positiecode" itemValue={row.positionCode} />}
        {row.opfType && <DataSummaryItem itemKey="OPF-type" itemValue={row.opfType} />}
        {opfDef && <DataSummaryItem itemKey="Budgettype" itemValue={opfDef.naturalCategory.toUpperCase()} />}
        {row.schaal && <DataSummaryItem itemKey="Schaal" itemValue={row.schaal} />}
        {row.annualCost && <DataSummaryItem itemKey="Jaarlijkse kosten" itemValue={formatCurrency(Number(row.annualCost))} />}
        {row.expectedStart && <DataSummaryItem itemKey="Verwachte start" itemValue={formatDate(row.expectedStart)} />}
        {row.expectedEnd && <DataSummaryItem itemKey="Verwachte einde" itemValue={formatDate(row.expectedEnd)} />}
        {row.requiredBefore && <DataSummaryItem itemKey="Vereist vóór" itemValue={formatDate(row.requiredBefore)} />}
      </DataSummary>

      {/* Current team coupling */}
      <section style={{ marginBottom: "2rem" }}>
        <Heading level={2} style={{ marginBottom: "1rem" }}>Teamkoppeling</Heading>
        {activeCoupling ? (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", background: "var(--rvo-color-hemelblauw-50)", borderRadius: "0.375rem" }}>
            <div>
              <strong>
                <Link href={`/teams/${activeCoupling.team.id}`} className="utrecht-link">{activeCoupling.team.name}</Link>
              </strong>
              <Paragraph style={{ margin: "0.125rem 0 0", fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)" }}>
                Gekoppeld vanaf {formatDate(activeCoupling.startDate)}
              </Paragraph>
            </div>
          </div>
        ) : (
          <Paragraph style={{ color: "var(--rvo-color-grijs-600)" }}>
            Niet gekoppeld aan een team.
          </Paragraph>
        )}

        {row.teamCouplings.filter(c => c.endDate).length > 0 && (
          <details style={{ marginTop: "0.75rem" }}>
            <summary style={{ cursor: "pointer", fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)" }}>
              {row.teamCouplings.filter(c => c.endDate).length} eerdere koppeling(en)
            </summary>
            <table className="utrecht-table" style={{ width: "100%", marginTop: "0.5rem", borderCollapse: "collapse" }}>
              <thead className="utrecht-table__header">
                <tr className="utrecht-table__row">
                  <th className="utrecht-table__header-cell">Team</th>
                  <th className="utrecht-table__header-cell">Van</th>
                  <th className="utrecht-table__header-cell">Tot</th>
                </tr>
              </thead>
              <tbody className="utrecht-table__body">
                {row.teamCouplings.filter(c => c.endDate).map(c => (
                  <tr key={c.id} className="utrecht-table__row">
                    <td className="utrecht-table__cell">
                      <Link href={`/teams/${c.team.id}`} className="utrecht-link">{c.team.name}</Link>
                    </td>
                    <td className="utrecht-table__cell">{formatDate(c.startDate)}</td>
                    <td className="utrecht-table__cell">{c.endDate ? formatDate(c.endDate) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </section>

      {/* Current assignment */}
      <section style={{ marginBottom: "2rem" }}>
        <Heading level={2} style={{ marginBottom: "1rem" }}>Medewerker</Heading>
        {activeAssignment ? (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link href={`/medewerkers/${activeAssignment.employee.id}`} className="utrecht-link" style={{ fontWeight: 600 }}>
              {activeAssignment.employee.firstName}{" "}
              {activeAssignment.employee.prefixName ? `${activeAssignment.employee.prefixName} ` : ""}
              {activeAssignment.employee.lastName}
            </Link>
            <span style={{ fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)" }}>
              Toegewezen vanaf {formatDate(activeAssignment.startDate)}
            </span>
          </div>
        ) : (
          <Paragraph style={{ color: "var(--rvo-color-grijs-600)" }}>Geen actieve medewerker.</Paragraph>
        )}
      </section>

      {/* Funding */}
      {row.fundingAllocations.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <Heading level={2} style={{ marginBottom: "1rem" }}>Financiering</Heading>
          <table className="utrecht-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead className="utrecht-table__header">
              <tr className="utrecht-table__row">
                <th className="utrecht-table__header-cell">Financieringsbron</th>
                <th className="utrecht-table__header-cell">Type / Jaar</th>
                <th className="utrecht-table__header-cell">Bedrag</th>
                <th className="utrecht-table__header-cell">Status</th>
              </tr>
            </thead>
            <tbody className="utrecht-table__body">
              {row.fundingAllocations.map(al => (
                <tr key={al.id} className="utrecht-table__row">
                  <td className="utrecht-table__cell">
                    {al.financialSourceAmount?.financialSource
                      ? <Link href={`/financiering/${al.financialSourceAmount.financialSource.id}`} className="utrecht-link">{al.financialSourceAmount.financialSource.name}</Link>
                      : "—"}
                  </td>
                  <td className="utrecht-table__cell">
                    {al.financialSourceAmount?.type
                      ? `${al.financialSourceAmount.type.type} ${al.financialSourceAmount.type.year}`
                      : "—"}
                  </td>
                  <td className="utrecht-table__cell">
                    {al.amount ? <CurrencyDisplay value={Number(al.amount)} /> : al.percentage ? `${al.percentage}%` : "—"}
                  </td>
                  <td className="utrecht-table__cell">
                    <StatusBadge label={al.status} color={al.status === "active" ? "green" : "grey"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <CommentSection
        comments={rowComments.map(c => ({
          id: c.id,
          body: c.body,
          createdAt: c.createdAt,
          createdByUser: { name: c.createdByUser.name, email: c.createdByUser.email },
        }))}
        commentableType="position"
        commentableId={id}
        currentUserId={session.user.id!}
      />

      <AuditLog events={audit} />
    </div>
  );
}
