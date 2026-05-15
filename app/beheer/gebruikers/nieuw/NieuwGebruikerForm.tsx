"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Paragraph } from "@rijkshuisstijl-community/components-react";
import { createUser } from "./actions";

export function NieuwGebruikerForm({ organisations }: { organisations: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createUser, undefined);

  return (
    <form action={action} style={{ maxWidth: "480px" }}>
      {state?.error && (
        <div role="alert" style={{ padding: "1rem", marginBottom: "1.5rem", borderLeft: "4px solid var(--rvo-color-rood-600)", background: "var(--rvo-color-rood-100)" }}>
          <Paragraph style={{ margin: 0 }}>{state.error}</Paragraph>
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="name" className="utrecht-form-label">Naam</label>
        <input id="name" name="name" type="text" required className="utrecht-textbox"
          style={{ display: "block", width: "100%", marginTop: "0.5rem" }} />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="email" className="utrecht-form-label">E-mailadres</label>
        <input id="email" name="email" type="email" required autoComplete="off"
          className="utrecht-textbox" style={{ display: "block", width: "100%", marginTop: "0.5rem" }} />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="password" className="utrecht-form-label">Tijdelijk wachtwoord</label>
        <Paragraph style={{ marginTop: "0.25rem", marginBottom: "0.5rem", fontSize: "0.85em", color: "var(--rvo-color-grijs-600)" }}>
          Minimaal 12 tekens. De gebruiker dient dit bij eerste inlog te wijzigen.
        </Paragraph>
        <input id="password" name="password" type="password" required autoComplete="new-password"
          minLength={12} className="utrecht-textbox"
          style={{ display: "block", width: "100%", marginTop: "0.5rem" }} />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="role" className="utrecht-form-label">Rol</label>
        <select id="role" name="role" className="utrecht-select"
          style={{ display: "block", width: "100%", marginTop: "0.5rem" }}>
          <option value="viewer">Viewer</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {organisations.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <label htmlFor="organisationId" className="utrecht-form-label">Organisatie</label>
          <select id="organisationId" name="organisationId" className="utrecht-select"
            style={{ display: "block", width: "100%", marginTop: "0.5rem" }}>
            <option value="">— Geen specifieke organisatie —</option>
            {organisations.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      )}

      <button type="submit" disabled={pending} className="utrecht-button utrecht-button--primary-action">
        {pending ? "Bezig…" : "Account aanmaken"}
      </button>
      <Link href="/beheer/gebruikers" style={{ marginLeft: "1rem" }}>Annuleren</Link>
    </form>
  );
}
