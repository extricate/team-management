import type { Metadata } from "next";
import "@rijkshuisstijl-community/font/dist/index.css";
import "@rijkshuisstijl-community/design-tokens/dist/index.css";
import "@utrecht/button-css/dist/index.css";
import "./globals.css";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SiteHeader, SiteFooter } from "@/components/ui";

export const metadata: Metadata = {
  title: "Teambeheer",
  description: "Teambeheer applicatie",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userName = session?.user?.name ?? session?.user?.email ?? undefined;

  // DB-backed enforcement: can't be bypassed by clearing the cookie
  if (session?.user?.mustChangePassword) {
    const headersList = await headers();
    const pathname = headersList.get("x-current-path") ?? "";
    const isBypassed =
      pathname.startsWith("/wachtwoord-wijzigen") ||
      pathname.startsWith("/inloggen") ||
      pathname.startsWith("/api/");
    if (!isBypassed) {
      redirect(`/wachtwoord-wijzigen${pathname && pathname !== "/" ? `?callbackUrl=${encodeURIComponent(pathname)}` : ""}`);
    }
  }

  return (
    <html lang="nl" className="rhc-theme">
      <body>
        <a href="#main-content" className="skip-link">Ga naar inhoud</a>
        <div className="page-wrapper">
          <SiteHeader userName={userName} />
          <main id="main-content">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
