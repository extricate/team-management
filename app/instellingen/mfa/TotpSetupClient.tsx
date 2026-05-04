"use client";

import { useState, useTransition } from "react";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";

interface SetupState {
  secret: string;
  uri: string;
}

interface ConfirmState {
  recoveryCodes: string[];
}

export function TotpSetupClient() {
  const [step, setStep] = useState<"idle" | "setup" | "confirm" | "done">("idle");
  const [setupData, setSetupData] = useState<SetupState | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function startSetup() {
    startTransition(async () => {
      setError("");
      const res = await fetch("/api/users/totp", { method: "POST" });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Er is een fout opgetreden."); return; }
      setSetupData(json.data);
      setStep("setup");
    });
  }

  async function confirmSetup() {
    startTransition(async () => {
      setError("");
      const res = await fetch("/api/users/totp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Er is een fout opgetreden."); return; }
      setRecoveryCodes((json.data as ConfirmState).recoveryCodes);
      setStep("done");
    });
  }

  if (step === "idle") {
    return (
      <div>
        <Paragraph>
          Twee-factor authenticatie voegt een extra beveiligingslaag toe aan uw account.
          U heeft een authenticator-app nodig (bijv. Google Authenticator, Authy, of Microsoft Authenticator).
        </Paragraph>
        <button onClick={startSetup} disabled={isPending} className="utrecht-button utrecht-button--primary-action">
          {isPending ? "Bezig…" : "MFA instellen"}
        </button>
      </div>
    );
  }

  if (step === "setup" && setupData) {
    return (
      <div>
        <Heading level={2}>Stap 1: Scan de QR-code</Heading>
        <Paragraph>Scan de onderstaande code met uw authenticator-app.</Paragraph>

        {/* QR-code rendered via an external-free approach: link + manual entry */}
        <div style={{ margin: "1.5rem 0", padding: "1rem", background: "var(--rvo-color-grijs-100)", borderRadius: "4px" }}>
          <Paragraph style={{ marginBottom: "0.5rem", fontWeight: "600" }}>Handmatige invoer (als QR-code niet werkt):</Paragraph>
          <code style={{ wordBreak: "break-all", fontSize: "1.1em", letterSpacing: "0.1em" }}>{setupData.secret}</code>
          <Paragraph style={{ marginTop: "0.5rem", fontSize: "0.85em", color: "var(--rvo-color-grijs-600)" }}>
            Algoritme: SHA1 | Cijfers: 6 | Periode: 30s
          </Paragraph>
        </div>

        <Heading level={2}>Stap 2: Voer de code in</Heading>
        <Paragraph>Voer de 6-cijferige code uit uw authenticator-app in ter bevestiging.</Paragraph>

        {error && (
          <div role="alert" style={{ padding: "0.75rem", marginBottom: "1rem", borderLeft: "4px solid var(--rvo-color-rood-600)", background: "var(--rvo-color-rood-100)" }}>
            <Paragraph style={{ margin: 0 }}>{error}</Paragraph>
          </div>
        )}

        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
          <div>
            <label htmlFor="totp-code" className="utrecht-form-label">Verificatiecode</label>
            <input
              id="totp-code" type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="utrecht-textbox"
              style={{ display: "block", width: "8rem", marginTop: "0.5rem", letterSpacing: "0.3em", fontSize: "1.25rem" }}
              placeholder="000000"
            />
          </div>
          <button onClick={confirmSetup} disabled={isPending || code.length !== 6}
            className="utrecht-button utrecht-button--primary-action">
            {isPending ? "Bezig…" : "Bevestigen"}
          </button>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div>
        <div style={{ padding: "1rem", marginBottom: "1.5rem", borderLeft: "4px solid var(--rvo-color-groen-600)", background: "var(--rvo-color-groen-100)" }}>
          <Paragraph style={{ margin: 0, fontWeight: "600" }}>MFA is succesvol ingesteld.</Paragraph>
        </div>

        <Heading level={2}>Herstelcodes — bewaar deze veilig!</Heading>
        <Paragraph>
          Gebruik een herstelcode als u geen toegang heeft tot uw authenticator-app.
          Elke code is maar één keer bruikbaar. Bewaar deze op een veilige, offline locatie.
        </Paragraph>

        <div style={{ padding: "1.5rem", background: "var(--rvo-color-grijs-100)", borderRadius: "4px", marginBottom: "1.5rem", fontFamily: "monospace" }}>
          {recoveryCodes.map((c) => (
            <div key={c} style={{ padding: "0.25rem 0", fontSize: "1.1em", letterSpacing: "0.1em" }}>{c}</div>
          ))}
        </div>

        <Paragraph style={{ color: "var(--rvo-color-rood-700)", fontWeight: "600" }}>
          ⚠ Deze codes worden niet opnieuw getoond. Kopieer ze nu.
        </Paragraph>

        <a href="/dashboard" className="utrecht-button utrecht-button--primary-action">
          Doorgaan naar dashboard
        </a>
      </div>
    );
  }

  return null;
}
