"use client";

import { useActionState } from "react";
import { Paragraph } from "@rijkshuisstijl-community/components-react";
import { changePassword } from "./actions";

interface Props {
  callbackUrl?: string;
}

export function WachtwoordWijzigenForm({ callbackUrl }: Props) {
  const [state, action, pending] = useActionState(changePassword, undefined);

  return (
    <form action={action}>
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}

      {state?.error && (
        <div role="alert" style={{ padding: "1rem", marginBottom: "1.5rem", borderLeft: "4px solid var(--rvo-color-rood-600)", background: "var(--rvo-color-rood-100)" }}>
          <Paragraph style={{ margin: 0 }}>{state.error}</Paragraph>
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="password" className="utrecht-form-label">Nieuw wachtwoord</label>
        <input
          id="password" name="password" type="password" required autoComplete="new-password"
          className="utrecht-textbox"
          style={{ display: "block", width: "100%", marginTop: "0.5rem" }}
        />
        <Paragraph style={{ marginTop: "0.25rem", fontSize: "0.875rem", color: "var(--rvo-color-grijs-600)" }}>
          Minimaal 12 tekens.
        </Paragraph>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <label htmlFor="confirmPassword" className="utrecht-form-label">Bevestig nieuw wachtwoord</label>
        <input
          id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password"
          className="utrecht-textbox"
          style={{ display: "block", width: "100%", marginTop: "0.5rem" }}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="utrecht-button utrecht-button--primary-action"
      >
        {pending ? "Bezig…" : "Wachtwoord instellen"}
      </button>
    </form>
  );
}
