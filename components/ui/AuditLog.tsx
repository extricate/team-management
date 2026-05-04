import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";

const actionLabels: Record<string, string> = {
  create: "Aangemaakt",
  update: "Bijgewerkt",
  delete: "Verwijderd",
  archive: "Gearchiveerd",
  assign: "Toegewezen",
  reallocate: "Herverdeeld",
};

const fieldLabels: Record<string, string> = {
  name: "Naam",
  fullName: "Volledige naam",
  email: "E-mailadres",
  description: "Omschrijving",
  fte: "FTE",
  startDate: "Startdatum",
  endDate: "Einddatum",
  isActive: "Actief",
  amount: "Bedrag",
  year: "Jaar",
  type: "Type",
  role: "Rol",
};

const SKIP_FIELDS = new Set(["id", "createdAt", "updatedAt", "deletedAt"]);

function toLabel(field: string): string {
  return (
    fieldLabels[field] ??
    field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())
  );
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Ja" : "Nee";
  if (typeof val === "string") {
    // ISO date strings
    if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(val)) {
      const d = new Date(val);
      if (!isNaN(d.getTime()))
        return d.toLocaleDateString("nl-NL", { dateStyle: "medium" });
    }
    return val;
  }
  if (typeof val === "number") return String(val);
  return JSON.stringify(val);
}

type DiffEntry = { field: string; from: unknown; to: unknown };

function computeDiff(
  before: unknown,
  after: unknown,
  mode: "diff" | "after-only" | "before-only"
): DiffEntry[] {
  const beforeObj = (before as Record<string, unknown>) ?? {};
  const afterObj = (after as Record<string, unknown>) ?? {};

  if (mode === "after-only") {
    return Object.entries(afterObj)
      .filter(([k]) => !SKIP_FIELDS.has(k))
      .map(([k, v]) => ({ field: k, from: undefined, to: v }));
  }

  if (mode === "before-only") {
    return Object.entries(beforeObj)
      .filter(([k]) => !SKIP_FIELDS.has(k))
      .map(([k, v]) => ({ field: k, from: v, to: undefined }));
  }

  // diff mode: only fields that changed
  const allKeys = new Set([
    ...Object.keys(beforeObj),
    ...Object.keys(afterObj),
  ]);
  const changes: DiffEntry[] = [];
  for (const key of allKeys) {
    if (SKIP_FIELDS.has(key)) continue;
    const from = beforeObj[key];
    const to = afterObj[key];
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes.push({ field: key, from, to });
    }
  }
  return changes;
}

function selectMode(
  action: string,
  before: unknown,
  after: unknown
): "diff" | "after-only" | "before-only" | null {
  if (before && after) return "diff";
  if (!before && after) return "after-only";
  if (before && !after) return "before-only";
  return null;
}

interface AuditData {
  id: string;
  action: string;
  reason: string | null;
  createdAt: Date;
  actorUser: { name: string | null; email: string } | null;
  beforeJson?: unknown;
  afterJson?: unknown;
}

export function AuditLog({ events }: { events: AuditData[] }) {
  return (
    <section>
      <Heading level={2} style={{ marginBottom: "1rem" }}>
        Wijzigingshistorie
      </Heading>
      {events.length === 0 && (
        <Paragraph
          style={{ color: "var(--rvo-color-grijs-600)", fontStyle: "italic" }}
        >
          Geen wijzigingen vastgelegd.
        </Paragraph>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {events.map((ev) => {
          const mode = selectMode(ev.action, ev.beforeJson, ev.afterJson);
          const diff = mode
            ? computeDiff(ev.beforeJson, ev.afterJson, mode)
            : [];

          return (
            <div
              key={ev.id}
              style={{
                borderLeft: "3px solid var(--rvo-color-grijs-300)",
                paddingLeft: "1rem",
                fontSize: "0.875rem",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "0.125rem" }}>
                {actionLabels[ev.action] ?? ev.action}
                <span
                  style={{
                    fontWeight: 400,
                    color: "var(--rvo-color-grijs-600)",
                    marginLeft: "0.5rem",
                  }}
                >
                  door{" "}
                  {ev.actorUser?.name ?? ev.actorUser?.email ?? "Systeem"}
                </span>
              </div>
              <div style={{ color: "var(--rvo-color-grijs-600)" }}>
                {new Date(ev.createdAt).toLocaleString("nl-NL", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </div>
              {ev.reason && (
                <div
                  style={{
                    marginTop: "0.25rem",
                    fontStyle: "italic",
                    color: "var(--rvo-color-grijs-700)",
                  }}
                >
                  Reden: {ev.reason}
                </div>
              )}
              {diff.length > 0 && (
                <table
                  style={{
                    marginTop: "0.5rem",
                    borderCollapse: "collapse",
                    width: "100%",
                    fontSize: "0.8125rem",
                  }}
                >
                  <tbody>
                    {diff.map(({ field, from, to }) => (
                      <tr key={field}>
                        <td
                          style={{
                            color: "var(--rvo-color-grijs-600)",
                            paddingRight: "0.75rem",
                            whiteSpace: "nowrap",
                            verticalAlign: "top",
                            paddingBottom: "0.1rem",
                          }}
                        >
                          {toLabel(field)}
                        </td>
                        {mode === "diff" ? (
                          <td style={{ verticalAlign: "top" }}>
                            <span
                              style={{
                                textDecoration: "line-through",
                                color: "var(--rvo-color-rood-600, #c0392b)",
                                marginRight: "0.5rem",
                              }}
                            >
                              {formatValue(from)}
                            </span>
                            <span
                              style={{
                                color: "var(--rvo-color-groen-600, #27ae60)",
                              }}
                            >
                              {formatValue(to)}
                            </span>
                          </td>
                        ) : mode === "after-only" ? (
                          <td
                            style={{
                              color: "var(--rvo-color-grijs-800)",
                              verticalAlign: "top",
                            }}
                          >
                            {formatValue(to)}
                          </td>
                        ) : (
                          <td
                            style={{
                              color: "var(--rvo-color-grijs-800)",
                              verticalAlign: "top",
                            }}
                          >
                            {formatValue(from)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
