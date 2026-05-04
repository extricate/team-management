"use client";

import { useActionState } from "react";
import { Paragraph } from "@rijkshuisstijl-community/components-react";
import { signInWithPassword } from "./actions";

interface Props { callbackUrl?: string }

export function PasswordLoginForm({ callbackUrl }: Props) {
  const [state, action, pending] = useActionState(signInWithPassword, undefined);

  return (
    <form action={action}>
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}

      {state?.error && (
        <div role="alert" style={{ padding: "1rem", marginBottom: "1.5rem", borderLeft: "4px solid var(--rvo-color-rood-600)", background: "var(--rvo-color-rood-100)" }}>
          <Paragraph style={{ margin: 0 }}>{state.error}</Paragraph>
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="email" className="utrecht-form-label">E-mailadres</label>
        <input
          id="email" name="email" type="email" required autoComplete="username"
          className="utrecht-textbox"
          style={{ display: "block", width: "100%", marginTop: "0.5rem" }}
          placeholder="naam@organisatie.nl"
        />
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <label htmlFor="password" className="utrecht-form-label">Wachtwoord</label>
        <input
          id="password" name="password" type="password" required autoComplete="current-password"
          className="utrecht-textbox"
          style={{ display: "block", width: "100%", marginTop: "0.5rem" }}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="utrecht-button utrecht-button--primary-action"
      >
        {pending ? "Bezig…" : "Inloggen"}
      </button>
    </form>
  );
}
