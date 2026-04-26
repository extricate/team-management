"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface Org { id: string; name: string; }

export default function NieuweMedewerkerPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/organisations")
      .then(r => r.json())
      .then(({ data }) => { setOrgs(data ?? []); setReady(true); });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationId: fd.get("organisationId"),
          firstName: fd.get("firstName"),
          prefixName: (fd.get("prefixName") as string) || undefined,
          lastName: fd.get("lastName"),
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Er is een fout opgetreden.");
        return;
      }
      const { data } = await res.json();
      router.push(`/medewerkers/${data.id}`);
    } catch {
      setError("Er is een verbindingsfout opgetreden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[{ label: "Medewerkers", href: "/medewerkers" }, { label: "Nieuwe medewerker" }]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Nieuwe medewerker</Heading>

      {error && (
        <div role="alert" className="form-alert">
          <p>{error}</p>
        </div>
      )}

      {!ready ? (
        <p className="page-loading">Laden…</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="organisationId" className="utrecht-form-label">
              Organisatie <span className="form-required" aria-label="verplicht">*</span>
            </label>
            <select id="organisationId" name="organisationId" className="utrecht-select" required>
              <option value="">— Kies een organisatie —</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "1rem", alignItems: "end" }}>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label htmlFor="firstName" className="utrecht-form-label">
                Voornaam <span className="form-required" aria-label="verplicht">*</span>
              </label>
              <input id="firstName" name="firstName" type="text" className="utrecht-textbox" style={{ maxWidth: "100%" }} required maxLength={100} autoFocus />
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label htmlFor="prefixName" className="utrecht-form-label">Tussenvoegsel</label>
              <input id="prefixName" name="prefixName" type="text" className="utrecht-textbox" style={{ maxWidth: "6rem" }} maxLength={20} />
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label htmlFor="lastName" className="utrecht-form-label">
                Achternaam <span className="form-required" aria-label="verplicht">*</span>
              </label>
              <input id="lastName" name="lastName" type="text" className="utrecht-textbox" style={{ maxWidth: "100%" }} required maxLength={100} />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
              {saving ? "Opslaan..." : "Medewerker aanmaken"}
            </button>
            <Link href="/medewerkers" className="utrecht-button utrecht-button--secondary-action">
              Annuleren
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
