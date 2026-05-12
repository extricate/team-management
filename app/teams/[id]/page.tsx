import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, comments, auditEvents, positions, financialSourceAmounts, companyPersexBudgets } from "@/lib/db/schema";
import { eq, isNull, desc, and, inArray } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CommentSection } from "@/components/ui/CommentSection";
import { AuditLog } from "@/components/ui/AuditLog";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { formatDate, formatCurrency, prorateCost } from "@/lib/utils";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { ArchiveButton } from "@/components/ui/ArchiveButton";
import { TransferPositionButton } from "@/components/ui/TransferPositionButton";
import { RemoveFundingButton } from "@/components/ui/RemoveFundingButton";
import { ArchivedBanner } from "@/components/ui/ArchivedBanner";
import { FilterableTeamMembersTable } from "@/components/ui/FilterableTeamMembersTable";
import { getOPFType, CATEGORY_LABELS, CATEGORY_BADGE_COLOR } from "@/lib/opf-types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await db.query.teams.findFirst({ where: eq(teams.id, id) });
  return { title: team ? `${team.name} – Teambeheer` : "Team – Teambeheer" };
}

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const team = await db.query.teams.findFirst({
    where: eq(teams.id, id),
    with: {
      organisation: true,
      positions: {
        where: isNull(positions.deletedAt),
        with: {
          assignments: { with: { employee: true } },
          bestelling: true,
          // Load allocations without nested source amount to avoid alias collision
          // (teams_positions_fundingAllocations_financialSourceAmount_financialSource/Type
          // both truncate to the same 63-char PostgreSQL identifier)
          fundingAllocations: {
            orderBy: (fa, { desc }) => [desc(fa.createdAt)],
          },
        },
      },
      memberships: { with: { employee: true }, orderBy: (m, { desc }) => [desc(m.startDate)] },
    },
  });

  if (!team) notFound();

  const isArchived = !!team.deletedAt;

  // Load source amounts separately to avoid the deep-join alias collision
  const allAmountIds = Array.from(new Set(
    team.positions.flatMap(p => p.fundingAllocations.map(fa => fa.financialSourceAmountId)).filter(Boolean) as string[],
  ));
  const sourceAmounts = allAmountIds.length > 0
    ? await db.query.financialSourceAmounts.findMany({
        where: inArray(financialSourceAmounts.id, allAmountIds),
        with: { financialSource: true, type: true },
      })
    : [];
  const sourceAmountMap = new Map(sourceAmounts.map(a => [a.id, a]));

  // Load company persex budgets referenced by allocations
  const allPersexIds = Array.from(new Set(
    team.positions.flatMap(p => p.fundingAllocations.map(fa => fa.companyPersexBudgetId)).filter(Boolean) as string[],
  ));
  const persexBudgets = allPersexIds.length > 0
    ? await db.select().from(companyPersexBudgets).where(inArray(companyPersexBudgets.id, allPersexIds))
    : [];
  const persexBudgetMap = new Map(persexBudgets.map(b => [b.id, b]));

  const teamComments = await db.query.comments.findMany({
    where: and(eq(comments.commentableType, "team"), eq(comments.commentableId, id)),
    with: { createdByUser: true },
    orderBy: [desc(comments.createdAt)],
  });

  const audit = await db.query.auditEvents.findMany({
    where: and(eq(auditEvents.entityType, "team"), eq(auditEvents.entityId, id)),
    with: { actorUser: true },
    orderBy: [desc(auditEvents.createdAt)],
    limit: 50,
  });

  const activeMembers    = team.memberships.filter(m => m.status === "active" && !m.endDate);
  const totalPositions   = team.positions.length;
  const filledPositions  = team.positions.filter(p => p.status === "filled").length;
  const openPositions    = team.positions.filter(p => p.status === "open").length;
  const fundedPositions  = team.positions.filter(p => p.fundingAllocations.some(fa => fa.status === "active")).length;

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: "Teams", href: "/teams" }, { label: team.name }]} />
      {isArchived && <ArchivedBanner deletedAt={team.deletedAt!} entityLabel={team.name} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
        <div>
          <Heading level={1} style={{ margin: "0 0 0.25rem 0" }}>{team.name}</Heading>
          <Paragraph style={{ margin: 0, color: "var(--rvo-color-grijs-600)" }}>
            {team.organisation.name} · {team.organisation.type}
          </Paragraph>
        </div>
        {!isArchived && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link href={`/teams/${team.id}/bewerken`} className="utrecht-button utrecht-button--secondary-action">
              Bewerken
            </Link>
            <ArchiveButton
              entityName={team.name}
              apiPath={`/api/teams/${team.id}`}
              redirectTo="/teams"
              warningText="Bijbehorende posities worden ook gearchiveerd."
            />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="stat-tiles">
        {[
          { label: "Actieve leden",   value: activeMembers.length },
          { label: "Totaal posities", value: totalPositions },
          { label: "Bezet",           value: filledPositions },
          { label: "Open",            value: openPositions },
          { label: "Gefinancierd",    value: fundedPositions },
        ].map(({ label, value }) => (
          <div key={label} className="stat-tile">
            <strong className="stat-tile__value">{value}</strong>
            <span className="stat-tile__label">{label}</span>
          </div>
        ))}
      </div>

      {/* Positions */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <Heading level={2}>Posities</Heading>
          {!isArchived && (
            <Link href={`/teams/${team.id}/posities/nieuw`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.875rem" }}>
              Positie toevoegen
            </Link>
          )}
        </div>
        {team.positions.length === 0 ? (
          <Paragraph style={{ color: "var(--rvo-color-grijs-600)" }}>Geen posities gevonden.</Paragraph>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {team.positions.map((pos) => {
              const activeAssignment = pos.assignments.find(a => a.status === "active");
              const activeAllocations = pos.fundingAllocations.filter(fa => fa.status === "active");
              const annualCost = Number(pos.annualCost ?? 0);
              const totalAllocated = activeAllocations.reduce((s, fa) => s + Number(fa.amount ?? 0), 0);
              const currentYear = new Date().getFullYear();
              const startYear = pos.expectedStart ? pos.expectedStart.getFullYear() : null;
              const relevantYear = startYear && startYear > currentYear ? startYear : currentYear;
              const effectiveCost = annualCost > 0 ? prorateCost(annualCost, pos.expectedStart, pos.expectedEnd, relevantYear) : 0;
              const isProrated = effectiveCost > 0 && effectiveCost < annualCost;
              const coveragePct = effectiveCost > 0 ? Math.min(100, Math.round((totalAllocated / effectiveCost) * 100)) : null;
              const opfDef = getOPFType(pos.opfType);

              return (
                <div key={pos.id} className="position-card">
                  {/* Position header */}
                  <div className="position-card__header">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "1rem" }}>{pos.type}</strong>
                      {pos.positionCode && (
                        <span style={{ color: "var(--rvo-color-grijs-600)", fontSize: "0.875rem" }}>{pos.positionCode}</span>
                      )}
                      {opfDef && (
                        <>
                          <span style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)" }}>{opfDef.label}</span>
                          <StatusBadge label={CATEGORY_LABELS[opfDef.naturalCategory]} color={CATEGORY_BADGE_COLOR[opfDef.naturalCategory]} />
                        </>
                      )}
                      {pos.schaal && (
                        <StatusBadge label={`Schaal ${pos.schaal}`} color="blue" />
                      )}
                      <StatusBadge label={pos.status} color={pos.status === "filled" ? "green" : pos.status === "open" ? "orange" : "grey"} />
                    </div>
                    {!isArchived && (
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <Link href={`/teams/${team.id}/posities/${pos.id}/financieren`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.8125rem", padding: "0.25rem 0.75rem" }}>
                          Financieren
                        </Link>
                        <Link href={`/teams/${team.id}/posities/${pos.id}/bewerken`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.8125rem", padding: "0.25rem 0.75rem" }}>
                          Bewerken
                        </Link>
                        <TransferPositionButton positionId={pos.id} positionName={pos.type} currentTeamId={team.id} />
                        <ArchiveButton
                          entityName={pos.type}
                          apiPath={`/api/positions/${pos.id}`}
                          warningText="Actieve toewijzingen worden afgesloten."
                          size="sm"
                        />
                      </div>
                    )}
                  </div>

                  {/* Position body */}
                  <div className="position-card__body">
                    {/* Left: occupant + dates */}
                    <div>
                      <div className="field-label">Bezet door</div>
                      {activeAssignment
                        ? <Link href={`/medewerkers/${activeAssignment.employee.id}`} className="utrecht-link" style={{ fontWeight: 500 }}>
                            {activeAssignment.employee.firstName} {activeAssignment.employee.lastName}
                          </Link>
                        : <span style={{ color: "var(--rvo-color-grijs-500)" }}>Onbezet</span>}
                      {(pos.expectedStart || pos.expectedEnd) && (
                        <div style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)", marginTop: "0.375rem" }}>
                          {pos.expectedStart && <>Start: {formatDate(pos.expectedStart)}</>}
                          {pos.expectedStart && pos.expectedEnd && " · "}
                          {pos.expectedEnd && <>Einde: {formatDate(pos.expectedEnd)}</>}
                        </div>
                      )}
                      {pos.bestelling && (
                        <div style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)", marginTop: "0.375rem" }}>
                          ATB: <Link href={`/bestellingen/${pos.bestelling.id}`} className="utrecht-link"><code>{pos.bestelling.atbNummer}</code></Link>
                        </div>
                      )}
                    </div>

                    {/* Right: cost + coverage */}
                    <div>
                      <div className="field-label">Financiering</div>
                      {annualCost > 0 ? (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                            <span style={{ fontWeight: 500 }}><CurrencyDisplay value={totalAllocated} /></span>
                            <span style={{ color: "var(--rvo-color-grijs-600)", fontSize: "0.875rem" }}>
                              / <CurrencyDisplay value={effectiveCost} />
                              {isProrated ? ` in ${relevantYear}` : " p.j."}
                            </span>
                            {coveragePct !== null && (
                              <StatusBadge
                                label={`${coveragePct}%`}
                                color={coveragePct >= 100 ? "green" : coveragePct > 0 ? "orange" : "grey"}
                              />
                            )}
                          </div>
                          {isProrated && (
                            <div style={{ fontSize: "0.75rem", color: "var(--rvo-color-grijs-600)", marginBottom: "0.25rem" }}>
                              {formatCurrency(annualCost)} p.j. – start {pos.expectedStart ? formatDate(pos.expectedStart) : "?"}
                            </div>
                          )}
                          {/* Progress bar */}
                          <div className="progress-bar">
                            <div className="progress-bar__fill" style={{ width: `${coveragePct ?? 0}%`, background: coveragePct! >= 100 ? "var(--rvo-color-groen-600)" : "var(--rvo-color-hemelblauw-500)" }} />
                          </div>
                        </>
                      ) : (
                        <span style={{ color: "var(--rvo-color-grijs-500)", fontSize: "0.875rem" }}>Geen kosten ingesteld</span>
                      )}
                      {/* Funding streams */}
                      {activeAllocations.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          {activeAllocations.map(fa => {
                            const pb = fa.companyPersexBudgetId ? persexBudgetMap.get(fa.companyPersexBudgetId) : undefined;
                            const sa = fa.financialSourceAmountId ? sourceAmountMap.get(fa.financialSourceAmountId) : undefined;
                            const label = pb
                              ? `Bedrijfspersex ${pb.year}`
                              : (sa?.financialSource.name ?? "—");
                            const typeSuffix = sa?.type ? ` · ${sa.type.type} ${sa.type.year}` : "";
                            return (
                              <div key={fa.id} style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-700)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                <span style={{ color: "var(--rvo-color-groen-700)" }}>✓</span>
                                {pb && <StatusBadge label="BP" color="purple" />}
                                {label}{typeSuffix}
                                {fa.amount && <span style={{ color: "var(--rvo-color-grijs-600)" }}>(<CurrencyDisplay value={fa.amount} />)</span>}
                                {!isArchived && <RemoveFundingButton allocationId={fa.id} sourceName={label} />}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Members */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <Heading level={2}>Teamleden</Heading>
          {!isArchived && (
            <Link href={`/teams/${team.id}/leden/toevoegen`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.875rem" }}>
              Lid toevoegen
            </Link>
          )}
        </div>
        <FilterableTeamMembersTable teamId={team.id} memberships={team.memberships} />
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        <CommentSection comments={teamComments} commentableType="team" commentableId={team.id} currentUserId={session.user.id!} />
        <AuditLog events={audit} />
      </div>
    </div>
  );
}
