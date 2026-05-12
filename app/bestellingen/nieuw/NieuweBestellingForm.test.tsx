// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NieuweBestellingForm } from "./NieuweBestellingForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@rijkshuisstijl-community/components-react", () => ({
  Heading: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
}));
vi.mock("@/components/ui/Breadcrumbs", () => ({ Breadcrumbs: () => null }));

const orgs = [
  { id: "org-a", name: "Organisatie A" },
  { id: "org-b", name: "Organisatie B" },
];
const types = [{ id: "type-1", naam: "Hardware" }];

describe("NieuweBestellingForm – standaard organisatie", () => {
  it("pre-selecteert de standaard organisatie wanneer opgegeven", () => {
    render(<NieuweBestellingForm orgs={orgs} types={types} defaultOrganisationId="org-b" />);
    const select = screen.getByRole("combobox", { name: /organisatie/i }) as HTMLSelectElement;
    expect(select.value).toBe("org-b");
  });

  it("toont de placeholder wanneer geen standaard organisatie is ingesteld", () => {
    render(<NieuweBestellingForm orgs={orgs} types={types} defaultOrganisationId={null} />);
    const select = screen.getByRole("combobox", { name: /organisatie/i }) as HTMLSelectElement;
    expect(select.value).toBe("");
  });
});
