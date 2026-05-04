import { redirect } from "next/navigation";
import Link from "next/link";
import { Heading, Paragraph } from "@rijkshuisstijl-community/components-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const metadata = { title: "Gebruikersbeheer – Teambeheer" };

export default async function GebruikersPage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen?callbackUrl=/beheer/gebruikers");
  if (session.user.role !== "admin") redirect("/dashboard");

  const allUsers = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    isEnabled: users.isEnabled,
    totpEnabled: users.totpEnabled,
    createdAt: users.createdAt,
  }).from(users).orderBy(users.createdAt);

  return (
    <main style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <Heading level={1}>Gebruikersbeheer</Heading>
        <Link href="/beheer/gebruikers/nieuw" className="utrecht-button utrecht-button--primary-action">
          Nieuw account
        </Link>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--rvo-color-grijs-300)" }}>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>Naam / E-mail</th>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>Rol</th>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>Status</th>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>MFA</th>
            <th style={{ padding: "0.5rem" }} />
          </tr>
        </thead>
        <tbody>
          {allUsers.map((u) => (
            <tr key={u.id} style={{ borderBottom: "1px solid var(--rvo-color-grijs-200)" }}>
              <td style={{ padding: "0.75rem 0.5rem" }}>
                <div style={{ fontWeight: "600" }}>{u.name ?? "—"}</div>
                <div style={{ fontSize: "0.85em", color: "var(--rvo-color-grijs-600)" }}>{u.email}</div>
              </td>
              <td style={{ padding: "0.75rem 0.5rem" }}>{u.role}</td>
              <td style={{ padding: "0.75rem 0.5rem" }}>
                <span style={{
                  display: "inline-block",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "999px",
                  fontSize: "0.8em",
                  fontWeight: "600",
                  background: u.isEnabled ? "var(--rvo-color-groen-200)" : "var(--rvo-color-grijs-200)",
                  color: u.isEnabled ? "var(--rvo-color-groen-800)" : "var(--rvo-color-grijs-700)",
                }}>
                  {u.isEnabled ? "Actief" : "Uitgeschakeld"}
                </span>
              </td>
              <td style={{ padding: "0.75rem 0.5rem" }}>
                {u.totpEnabled
                  ? <span style={{ color: "var(--rvo-color-groen-700)", fontWeight: "600" }}>✓ Ingeschakeld</span>
                  : <span style={{ color: "var(--rvo-color-grijs-600)" }}>Niet ingesteld</span>
                }
              </td>
              <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                <Link href={`/beheer/gebruikers/${u.id}`} className="utrecht-button utrecht-button--secondary-action" style={{ fontSize: "0.85em" }}>
                  Bewerken
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {allUsers.length === 0 && (
        <Paragraph>Geen gebruikers gevonden.</Paragraph>
      )}
    </main>
  );
}
