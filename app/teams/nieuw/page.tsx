"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "@rijkshuisstijl-community/components-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface Org { id: string; name: string; }

export default function NieuwTeamPage() {
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
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationId: fd.get("organisationId"),
          name: fd.get("name"),
          description: fd.get("description") || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Er is een fout opgetreden.");
        return;
      }
      const { data } = await res.json();
      router.push(`/teams/${data.id}`);
    } catch {
      setError("Er is een verbindingsfout opgetreden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="form-page">
      <Breadcrumbs crumbs={[{ label: "Teams", href: "/teams" }, { label: "Nieuw team" }]} />
      <Heading level={1} style={{ marginBottom: "1.5rem" }}>Nieuw team</Heading>

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

          <div className="form-field">
            <label htmlFor="name" className="utrecht-form-label">
              Naam <span className="form-required" aria-label="verplicht">*</span>
            </label>
            <input id="name" name="name" type="text" className="utrecht-textbox" required maxLength={200} autoFocus />
          </div>

          <div className="form-field">
            <label htmlFor="description" className="utrecht-form-label">Beschrijving</label>
            <textarea id="description" name="description" className="utrecht-textarea" rows={4} maxLength={1000} />
          </div>

          <div className="form-actions">
            <button type="submit" className="utrecht-button utrecht-button--primary-action" disabled={saving}>
              {saving ? "Opslaan..." : "Team aanmaken"}
            </button>
            <Link href="/teams" className="utrecht-button utrecht-button--secondary-action">
              Annuleren
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
