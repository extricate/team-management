import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/lib/auth";
import { SiteHeader, SiteFooter } from "@/components/ui";

export const metadata: Metadata = {
  title: "Teambeheer",
  description: "Rijksoverheid teambeheer applicatie",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userName = session?.user?.name ?? undefined;

  return (
    <html lang="nl">
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
