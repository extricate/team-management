"use client";

import { useState } from "react";

type Org = { id: string; name: string };

export function DefaultOrgSelector({
  organisations,
  currentDefaultId,
}: {
  organisations: Org[];
  currentDefaultId: string | null;
}) {
  const [selected, setSelected] = useState(currentDefaultId ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    setStatus("saving");
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultOrganisationId: selected || null }),
    });
    setStatus(res.ok ? "saved" : "error");
    if (res.ok) setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
        <div>
          <label
            htmlFor="defaultOrgId"
            style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--rvo-color-grijs-700)" }}
          >
            Standaard organisatie
          </label>
          <select
            id="defaultOrgId"
            className="utrecht-select"
            value={selected}
            onChange={(e) => { setSelected(e.target.value); setStatus("idle"); }}
          >
            <option value="">Geen standaard</option>
            {organisations.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="utrecht-button utrecht-button--primary-action"
          onClick={save}
          disabled={status === "saving"}
        >
          {status === "saving" ? "Opslaan…" : "Opslaan"}
        </button>
      </div>
      {status === "saved" && (
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--rvo-color-groen-600)" }}>
          Standaard organisatie opgeslagen.
        </p>
      )}
      {status === "error" && (
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--rvo-color-rood-600)" }}>
          Opslaan mislukt. Probeer het opnieuw.
        </p>
      )}
    </div>
  );
}
