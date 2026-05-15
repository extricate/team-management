"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Paragraph } from "@rijkshuisstijl-community/components-react";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isEnabled: boolean;
  totpEnabled: boolean;
  organisationId: string | null;
}

interface Props {
  user: User;
  organisations: { id: string; name: string }[];
  action: (prevState: unknown, formData: FormData) => Promise<{ error: string } | undefined>;
}

export function EditGebruikerForm({ user, organisations, action }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} style={{ maxWidth: "480px" }}>
      {state?.error && (
        <div role="alert" style={{ padding: "1rem", marginBottom: "1.5rem", borderLeft: "4px solid var(--rvo-color-rood-600)", background: "var(--rvo-color-rood-100)" }}>
          <Paragraph style={{ margin: 0 }}>{state.error}</Paragraph>
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="name" className="utrecht-form-label">Naam</label>
        <input id="name" name="name" type="text" defaultValue={user.name ?? ""}
          className="utrecht-textbox" style={{ display: "block", width: "100%", marginTop: "0.5rem" }} />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label className="utrecht-form-label">E-mailadres</label>
        <Paragraph style={{ marginTop: "0.25rem", color: "var(--rvo-color-grijs-700)" }}>{user.email}</Paragraph>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="role" className="utrecht-form-label">Rol</label>
        <select id="role" name="role" defaultValue={user.role} className="utrecht-select"
          style={{ display: "block", width: "100%", marginTop: "0.5rem" }}>
          <option value="viewer">Viewer</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {organisations.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="organisationId" className="utrecht-form-label">Organisatie</label>
          <select id="organisationId" name="organisationId" defaultValue={user.organisationId ?? ""}
            className="utrecht-select" style={{ display: "block", width: "100%", marginTop: "0.5rem" }}>
            <option value="">— Geen specifieke organisatie —</option>
            {organisations.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="isEnabled" className="utrecht-form-label">Accountstatus</label>
        <select id="isEnabled" name="isEnabled" defaultValue={String(user.isEnabled)} className="utrecht-select"
          style={{ display: "block", width: "100%", marginTop: "0.5rem" }}>
          <option value="true">Actief</option>
          <option value="false">Uitgeschakeld</option>
        </select>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <label htmlFor="newPassword" className="utrecht-form-label">Nieuw wachtwoord <span style={{ fontWeight: "normal", color: "var(--rvo-color-grijs-600)" }}>(optioneel)</span></label>
        <input id="newPassword" name="newPassword" type="password" autoComplete="new-password"
          minLength={12} placeholder="Laat leeg om ongewijzigd te laten"
          className="utrecht-textbox" style={{ display: "block", width: "100%", marginTop: "0.5rem" }} />
      </div>

      <button type="submit" disabled={pending} className="utrecht-button utrecht-button--primary-action">
        {pending ? "Bezig…" : "Opslaan"}
      </button>
      <Link href="/beheer/gebruikers" style={{ marginLeft: "1rem" }}>Annuleren</Link>
    </form>
  );
}
