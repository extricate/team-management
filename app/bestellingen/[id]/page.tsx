import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Alert, DataSummary, DataSummaryItem, Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bestellingen } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchDetailSidebar } from "@/lib/loaders/detail";
import { CommentSection } from "@/components/ui/CommentSection";
import { AuditLog } from "@/components/ui/AuditLog";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { ArchiveButton } from "@/components/ui/ArchiveButton";
import { ArchivedBanner } from "@/components/ui/ArchivedBanner";
import { formatDate, formatCurrency, buildEntityMetadata } from "@/lib/utils";
import { getPositionTitel } from "@/lib/functies";
import { detectBestellingConflicts, calculateBestellingAllocation } from "@/lib/bestellingen";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await db.query.bestellingen.findFirst({ where: eq(bestellingen.id, id) });
  return buildEntityMetadata(row?.atbNummer, "Bestelling");
}

export default async function BestellingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const row = await db.query.bestellingen.findFirst({
    where: eq(bestellingen.id, id),
    with: {
      type: true,
      organisation: true,
      fundingAllocations: {
        with: {
          financialSourceAmount: { with: { financialSource: true, type: true } },
          createdByUser: true,
        },
        orderBy: (al, { desc }) => [desc(al.createdAt)],
      },
      positions: {
        with: { functie: { columns: { titel: true } }, teamCouplings: { with: { team: true } }, assignments: { with: { employee: true } } },
      },
    },
  });

  if (!row || (row.deletedAt && !row.deletedAt)) notFound();
  if (!row) notFound();

  const isArchived = !!row.deletedAt;

  const { comments: rowComments, audit } = await fetchDetailSidebar("bestelling", id);

  const allocationSummary = calculateBestellingAllocation({
    geraamdBedrag: row.geraamdBedrag,
    allocations: row.fundingAllocations,
  });

  const sourceAmounts = row.fundingAllocations
    .filter(al => al.status === "active" && al.financialSourceAmount)
    .map(al => ({
      id: al.financialSourceAmount!.id,
      status: al.financialSourceAmount!.status as "concept" | "released",
      financialType: al.financialSourceAmount!.type
        ? { type: al.financialSourceAmount!.type.type, year: al.financialSourceAmount!.type.year }
        : undefined,
    }));

  const conflicts = detectBestellingConflicts({
    bestelling: { id: row.id, geraamdBedrag: row.geraamdBedrag },
    allocations: row.fundingAllocations,
    sourceAmounts,
  });

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: "Bestellingen", href: "/bestellingen" }, { label: row.atbNummer }]} />

      {isArchived && <ArchivedBanner deletedAt={row.deletedAt!} entityLabel={row.atbNummer} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <Heading level={1} style={{ margin: "0 0 0.25rem 0" }}>{row.atbNummer}</Heading>
          <Paragraph style={{ margin: 0, color: "var(--rvo-color-grijs-600)" }}>{row.omschrijving}</Paragraph>
        </div>
        {!isArchived && (
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Link href={`/bestellingen/${id}/financieren`} className="utrecht-button utrecht-button--secondary-action">Financieren</Link>
            <Link href={`/bestellingen/${id}/bewerken`} className="utrecht-button utrecht-button--secondary-action">Bewerken</Link>
            <ArchiveButton entityName={row.atbNummer} apiPath={`/api/bestellingen/${id}`} redirectTo="/bestellingen" />
          </div>
        )}
      </div>

      {conflicts.length > 0 && (
        <div style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {conflicts.map((c, i) => (
            <Alert key={i} type={c.severity === "error" ? "error" : "warning"}>
              <Paragraph><strong>{c.severity === "error" ? "Fout" : "Waarschuwing"}:</strong> {c.message}</Paragraph>
            </Alert>
          ))}
        </div>
      )}

      {/* Metadata */}
      <DataSummary appearance="row" style={{ marginBottom: "2rem" }}>
        <DataSummaryItem itemKey="Type" itemValue={row.type.naam} />
        <DataSummaryItem itemKey="Organisatie" itemValue={row.organisation.name} />
        <DataSummaryItem itemKey="Aanvraagdatum" itemValue={row.aanvraagDatum ? formatDate(row.aanvraagDatum) : "—"} />
        <DataSummaryItem itemKey="Geraamd bedrag" itemValue={row.geraamdBedrag ? formatCurrency(Number(row.geraamdBedrag)) : "—"} />
        <DataSummaryItem itemKey="Werkelijk bedrag" itemValue={row.werkelijkBedrag ? formatCurrency(Number(row.werkelijkBedrag)) : "—"} />
      </DataSummary>

      {/* Budget summary */}
      <section style={{ marginBottom: "2rem" }}>
        <Heading level={2} style={{ marginBottom: "1rem" }}>Financiering</Heading>
        <div className="stat-tiles" style={{ marginBottom: "1.25rem" }}>
          {[
            { label: "Geraamd", value: allocationSummary.geraamd },
            { label: "Gealloceerd", value: allocationSummary.toegewezen },
            { label: "Beschikbaar", value: allocationSummary.beschikbaar },
          ].map(({ label, value }) => (
            <div key={label} className="stat-tile">
              <strong className="stat-tile__value" style={{ color: value < 0 ? "var(--rvo-color-rood-600)" : undefined }}>
                <CurrencyDisplay value={value} />
              </strong>
              <span className="stat-tile__label">{label}</span>
            </div>
          ))}
        </div>

        {row.fundingAllocations.length === 0 ? (
          <Paragraph style={{ color: "var(--rvo-color-grijs-600)" }}>Nog geen financiering gekoppeld. <Link href={`/bestellingen/${id}/financieren`} className="utrecht-link">Financier deze bestelling →</Link></Paragraph>
        ) : (
          <table className="utrecht-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead className="utrecht-table__header">
              <tr className="utrecht-table__row">
                <th className="utrecht-table__header-cell">Financieringsbron</th>
                <th className="utrecht-table__header-cell">Type / Jaar</th>
                <th className="utrecht-table__header-cell">Bedrag</th>
                <th className="utrecht-table__header-cell">Status</th>
                <th className="utrecht-table__header-cell">Gekoppeld door</th>
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
                  <td className="utrecht-table__cell" style={{ whiteSpace: "nowrap" }}>
                    {al.amount ? <CurrencyDisplay value={Number(al.amount)} /> : al.percentage ? `${al.percentage}%` : "—"}
                  </td>
                  <td className="utrecht-table__cell">{al.status}</td>
                  <td className="utrecht-table__cell" style={{ fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)" }}>
                    {al.createdByUser?.name ?? al.createdByUser?.email ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Linked external positions */}
      {row.positions.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <Heading level={2} style={{ marginBottom: "1rem" }}>Gekoppelde inhuurposities</Heading>
          <table className="utrecht-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead className="utrecht-table__header">
              <tr className="utrecht-table__row">
                <th className="utrecht-table__header-cell">Positie</th>
                <th className="utrecht-table__header-cell">Team</th>
                <th className="utrecht-table__header-cell">OPF-type</th>
                <th className="utrecht-table__header-cell">Medewerker</th>
              </tr>
            </thead>
            <tbody className="utrecht-table__body">
              {row.positions.map(pos => {
                const activeAssignment = pos.assignments.find(a => a.status === "active");
                return (
                  <tr key={pos.id} className="utrecht-table__row">
                    <td className="utrecht-table__cell">
                      {pos.teamCouplings[0]?.team
                        ? <Link href={`/teams/${pos.teamCouplings[0].team.id}`} className="utrecht-link">{getPositionTitel(pos)}</Link>
                        : getPositionTitel(pos)}
                    </td>
                    <td className="utrecht-table__cell">{pos.teamCouplings[0]?.team?.name ?? "—"}</td>
                    <td className="utrecht-table__cell"><code>{pos.opfType ?? "—"}</code></td>
                    <td className="utrecht-table__cell">
                      {activeAssignment
                        ? <Link href={`/medewerkers/${activeAssignment.employee.id}`} className="utrecht-link">
                            {activeAssignment.employee.firstName} {activeAssignment.employee.prefixName ? `${activeAssignment.employee.prefixName} ` : ""}{activeAssignment.employee.lastName}
                          </Link>
                        : <span style={{ color: "var(--rvo-color-grijs-500)" }}>Onbezet</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {row.notities && (
        <section style={{ marginBottom: "2rem" }}>
          <Heading level={2} style={{ marginBottom: "0.75rem" }}>Notities</Heading>
          <Paragraph style={{ whiteSpace: "pre-wrap" }}>{row.notities}</Paragraph>
        </section>
      )}

      <CommentSection
        comments={rowComments.map(c => ({
          id: c.id,
          body: c.body,
          createdAt: c.createdAt,
          createdByUser: { name: c.createdByUser.name, email: c.createdByUser.email },
        }))}
        commentableType="bestelling"
        commentableId={id}
        currentUserId={session.user.id!}
      />

      <AuditLog events={audit} />
    </div>
  );
}
