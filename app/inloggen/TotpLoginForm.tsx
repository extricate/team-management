"use client";

import { useActionState } from "react";
import { Paragraph } from "@rijkshuisstijl-community/components-react";
import { signInWithTotp } from "./actions";

interface Props { callbackUrl?: string }

export function TotpLoginForm({ callbackUrl }: Props) {
  const [state, action, pending] = useActionState(signInWithTotp, undefined);

  return (
    <form action={action}>
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}

      {state?.error && (
        <div role="alert" style={{ padding: "1rem", marginBottom: "1.5rem", borderLeft: "4px solid var(--rvo-color-rood-600)", background: "var(--rvo-color-rood-100)" }}>
          <Paragraph style={{ margin: 0 }}>{state.error}</Paragraph>
        </div>
      )}

      <div style={{ marginBottom: "1.5rem" }}>
        <label htmlFor="code" className="utrecht-form-label">Verificatiecode</label>
        <Paragraph style={{ marginTop: "0.25rem", marginBottom: "0.5rem", fontSize: "0.9em", color: "var(--rvo-color-grijs-600)" }}>
          Voer de 6-cijferige code in uit uw authenticator-app.
        </Paragraph>
        <input
          id="code" name="code" type="text" required
          inputMode="numeric" pattern="\d{6}" autoComplete="one-time-code"
          maxLength={6}
          className="utrecht-textbox"
          style={{ display: "block", width: "8rem", marginTop: "0.5rem", letterSpacing: "0.3em", fontSize: "1.25rem" }}
          placeholder="000000"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="utrecht-button utrecht-button--primary-action"
      >
        {pending ? "Bezig…" : "Verifiëren"}
      </button>

      <a href="/inloggen" style={{ marginLeft: "1rem", fontSize: "0.9em" }}>
        Terug naar inloggen
      </a>
    </form>
  );
}
