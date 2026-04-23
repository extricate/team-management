import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  return (
    <div>
      <h1 className="utrecht-heading-1">Dashboard</h1>
      <p className="utrecht-paragraph">
        Welkom terug, <strong>{session.user.name ?? session.user.email}</strong>.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem", marginTop: "2rem" }}>
        <div className="utrecht-card" style={{ padding: "1.5rem" }}>
          <h2 className="utrecht-heading-2" style={{ fontSize: "1.125rem" }}>Teams</h2>
          <p className="utrecht-paragraph">Beheer uw teams en teamleden.</p>
          <a href="/teams" className="utrecht-link">Naar teams →</a>
        </div>
        <div className="utrecht-card" style={{ padding: "1.5rem" }}>
          <h2 className="utrecht-heading-2" style={{ fontSize: "1.125rem" }}>Medewerkers</h2>
          <p className="utrecht-paragraph">Bekijk en beheer medewerkers.</p>
          <a href="/medewerkers" className="utrecht-link">Naar medewerkers →</a>
        </div>
        <div className="utrecht-card" style={{ padding: "1.5rem" }}>
          <h2 className="utrecht-heading-2" style={{ fontSize: "1.125rem" }}>Instellingen</h2>
          <p className="utrecht-paragraph">Applicatie-instellingen beheren.</p>
          <a href="/instellingen" className="utrecht-link">Naar instellingen →</a>
        </div>
      </div>
    </div>
  );
}
