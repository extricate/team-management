// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NieuweFinancieringForm } from "./NieuweFinancieringForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@rijkshuisstijl-community/components-react", () => ({
  Heading: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
}));
vi.mock("@/components/ui/Breadcrumbs", () => ({ Breadcrumbs: () => null }));

const orgs = [
  { id: "org-a", name: "Organisatie A" },
  { id: "org-b", name: "Organisatie B" },
];

describe("NieuweFinancieringForm – standaard organisatie", () => {
  it("pre-selecteert de standaard organisatie wanneer opgegeven", () => {
    render(<NieuweFinancieringForm orgs={orgs} defaultOrganisationId="org-a" />);
    const select = screen.getByRole("combobox", { name: /organisatie/i }) as HTMLSelectElement;
    expect(select.value).toBe("org-a");
  });

  it("toont de placeholder wanneer geen standaard organisatie is ingesteld", () => {
    render(<NieuweFinancieringForm orgs={orgs} defaultOrganisationId={null} />);
    const select = screen.getByRole("combobox", { name: /organisatie/i }) as HTMLSelectElement;
    expect(select.value).toBe("");
  });
});
