import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bestellingen, comments, auditEvents } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { CommentSection } from "@/components/ui/CommentSection";
import { AuditLog } from "@/components/ui/AuditLog";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { ArchiveButton } from "@/components/ui/ArchiveButton";
import { ArchivedBanner } from "@/components/ui/ArchivedBanner";
import { formatDate } from "@/lib/utils";
import { detectBestellingConflicts, calculateBestellingAllocation } from "@/lib/bestellingen";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await db.query.bestellingen.findFirst({ where: eq(bestellingen.id, id) });
  return { title: row ? `${row.atbNummer} – Teambeheer` : "Bestelling – Teambeheer" };
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
          financialSourceAmount: { with: { financialSource: true, financialType: true } },
          createdByUser: true,
        },
        orderBy: (al, { desc }) => [desc(al.createdAt)],
      },
      positions: {
        with: { team: true, assignments: { with: { employee: true } } },
      },
    },
  });

  if (!row || (row.deletedAt && !row.deletedAt)) notFound();
  if (!row) notFound();

  const isArchived = !!row.deletedAt;

  const rowComments = await db.query.comments.findMany({
    where: and(eq(comments.commentableType, "bestelling"), eq(comments.commentableId, id)),
    with: { createdByUser: true },
    orderBy: [desc(comments.createdAt)],
  });

  const audit = await db.query.auditEvents.findMany({
    where: and(eq(auditEvents.entityType, "bestelling"), eq(auditEvents.entityId, id)),
    with: { actorUser: true },
    orderBy: [desc(auditEvents.createdAt)],
    limit: 50,
  });

  const allocationSummary = calculateBestellingAllocation({
    geraamdBedrag: row.geraamdBedrag,
    allocations: row.fundingAllocations,
  });

  const sourceAmounts = row.fundingAllocations
    .filter(al => al.status === "active" && al.financialSourceAmount)
    .map(al => ({
      id: al.financialSourceAmount!.id,
      status: al.financialSourceAmount!.status as "concept" | "released",
      financialType: al.financialSourceAmount!.financialType
        ? { type: al.financialSourceAmount!.financialType.type, year: al.financialSourceAmount!.financialType.year }
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

      {isArchived && <ArchivedBanner entityName="bestelling" />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <Heading level={1} style={{ margin: "0 0 0.25rem 0" }}>{row.atbNummer}</Heading>
          <Paragraph style={{ margin: 0, color: "var(--rvo-color-grijs-600)" }}>{row.omschrijving}</Paragraph>
        </div>
        {!isArchived && (
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Link href={`/bestellingen/${id}/financieren`} className="utrecht-button utrecht-button--secondary-action">Financieren</Link>
            <Link href={`/bestellingen/${id}/bewerken`} className="utrecht-button utrecht-button--secondary-action">Bewerken</Link>
            <ArchiveButton entityType="bestellingen" entityId={id} redirectTo="/bestellingen" />
          </div>
        )}
      </div>

      {conflicts.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          {conflicts.map((c, i) => (
            <div key={i} role="alert" style={{
              padding: "0.75rem 1rem",
              marginBottom: "0.5rem",
              borderLeft: `4px solid ${c.severity === "error" ? "var(--rvo-color-rood)" : "var(--rvo-color-oranje)"}`,
              background: c.severity === "error" ? "var(--rvo-color-rood-50)" : "var(--rvo-color-oranje-50)",
              borderRadius: "0 4px 4px 0",
            }}>
              <strong>{c.severity === "error" ? "Fout" : "Waarschuwing"}:</strong> {c.message}
            </div>
          ))}
        </div>
      )}

      {/* Metadata */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem", padding: "1.25rem", background: "var(--rvo-color-grijs-100)", borderRadius: "4px" }}>
        <div>
          <dt style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)", marginBottom: "0.25rem" }}>Type</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>{row.type.naam}</dd>
        </div>
        <div>
          <dt style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)", marginBottom: "0.25rem" }}>Organisatie</dt>
          <dd style={{ margin: 0 }}>{row.organisation.name}</dd>
        </div>
        <div>
          <dt style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)", marginBottom: "0.25rem" }}>Aanvraagdatum</dt>
          <dd style={{ margin: 0 }}>{row.aanvraagDatum ? formatDate(row.aanvraagDatum) : "—"}</dd>
        </div>
        <div>
          <dt style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)", marginBottom: "0.25rem" }}>Geraamd bedrag</dt>
          <dd style={{ margin: 0 }}>{row.geraamdBedrag ? <CurrencyDisplay value={Number(row.geraamdBedrag)} /> : "—"}</dd>
        </div>
        <div>
          <dt style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)", marginBottom: "0.25rem" }}>Werkelijk bedrag</dt>
          <dd style={{ margin: 0 }}>{row.werkelijkBedrag ? <CurrencyDisplay value={Number(row.werkelijkBedrag)} /> : "—"}</dd>
        </div>
      </section>

      {/* Budget summary */}
      <section style={{ marginBottom: "2rem" }}>
        <Heading level={2} style={{ marginBottom: "1rem" }}>Financiering</Heading>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
          {[
            { label: "Geraamd", value: allocationSummary.geraamd },
            { label: "Gealloceerd", value: allocationSummary.toegewezen },
            { label: "Beschikbaar", value: allocationSummary.beschikbaar },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: "1rem", background: "var(--rvo-color-grijs-100)", borderRadius: "4px", textAlign: "center" }}>
              <div style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)", marginBottom: "0.25rem" }}>{label}</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: value < 0 ? "var(--rvo-color-rood)" : undefined }}>
                <CurrencyDisplay value={value} />
              </div>
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
                    {al.financialSourceAmount?.financialType
                      ? `${al.financialSourceAmount.financialType.type} ${al.financialSourceAmount.financialType.year}`
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
                      <Link href={`/teams/${pos.team.id}`} className="utrecht-link">{pos.type}</Link>
                    </td>
                    <td className="utrecht-table__cell">{pos.team.name}</td>
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
        commentableType="bestelling"
        commentableId={id}
        initialComments={rowComments.map(c => ({
          id: c.id,
          body: c.body,
          createdAt: c.createdAt.toISOString(),
          createdByUser: { name: c.createdByUser.name, email: c.createdByUser.email },
        }))}
      />

      <AuditLog events={audit} />
    </div>
  );
}
