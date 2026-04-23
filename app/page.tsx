import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <div>
      <h1 className="utrecht-heading-1">Welkom bij Teambeheer</h1>
      <p className="utrecht-paragraph">
        Beheer uw teams, medewerkers en rollen op één centrale plek.
      </p>
      {session?.user ? (
        <div style={{ marginTop: "2rem" }}>
          <p className="utrecht-paragraph">
            Ingelogd als <strong>{session.user.email}</strong>.
          </p>
          <Link href="/dashboard" className="utrecht-button utrecht-button--primary-action">
            Ga naar dashboard
          </Link>
        </div>
      ) : (
        <div style={{ marginTop: "2rem" }}>
          <Link href="/inloggen" className="utrecht-button utrecht-button--primary-action">
            Inloggen
          </Link>
        </div>
      )}
    </div>
  );
}
