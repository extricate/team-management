const actionLabels: Record<string, string> = {
  create: "Aangemaakt",
  update: "Bijgewerkt",
  delete: "Verwijderd",
  archive: "Gearchiveerd",
  assign: "Toegewezen",
  reallocate: "Herverdeeld",
};

interface AuditData {
  id: string;
  action: string;
  reason: string | null;
  createdAt: Date;
  actorUser: { name: string | null; email: string } | null;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
}

export function AuditLog({ events }: { events: AuditData[] }) {
  return (
    <section>
      <h2 className="utrecht-heading-2" style={{ marginBottom: "1rem" }}>Wijzigingshistorie</h2>
      {events.length === 0 && (
        <p className="utrecht-paragraph" style={{ color: "var(--rvo-color-grijs-600)", fontStyle: "italic" }}>
          Geen wijzigingen vastgelegd.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {events.map((ev) => (
          <div key={ev.id} style={{
            borderLeft: "3px solid var(--rvo-color-grijs-300, #c4c4c4)",
            paddingLeft: "1rem",
            fontSize: "0.875rem",
          }}>
            <div style={{ fontWeight: 600, marginBottom: "0.125rem" }}>
              {actionLabels[ev.action] ?? ev.action}
              <span style={{ fontWeight: 400, color: "var(--rvo-color-grijs-600)", marginLeft: "0.5rem" }}>
                door {ev.actorUser?.name ?? ev.actorUser?.email ?? "Systeem"}
              </span>
            </div>
            <div style={{ color: "var(--rvo-color-grijs-600)" }}>
              {new Date(ev.createdAt).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}
            </div>
            {ev.reason && (
              <div style={{ marginTop: "0.25rem", fontStyle: "italic", color: "var(--rvo-color-grijs-700)" }}>
                Reden: {ev.reason}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
