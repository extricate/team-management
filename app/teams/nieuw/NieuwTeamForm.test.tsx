// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NieuwTeamForm } from "./NieuwTeamForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@rijkshuisstijl-community/components-react", () => ({
  Heading: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
}));
vi.mock("@/components/ui/Breadcrumbs", () => ({ Breadcrumbs: () => null }));

const orgs = [
  { id: "org-a", name: "Organisatie A" },
  { id: "org-b", name: "Organisatie B" },
];

describe("NieuwTeamForm – standaard organisatie", () => {
  it("pre-selecteert de standaard organisatie wanneer opgegeven", () => {
    render(<NieuwTeamForm orgs={orgs} defaultOrganisationId="org-a" />);
    const select = screen.getByRole("combobox", { name: /organisatie/i }) as HTMLSelectElement;
    expect(select.value).toBe("org-a");
  });

  it("toont de placeholder wanneer geen standaard organisatie is ingesteld", () => {
    render(<NieuwTeamForm orgs={orgs} defaultOrganisationId={null} />);
    const select = screen.getByRole("combobox", { name: /organisatie/i }) as HTMLSelectElement;
    expect(select.value).toBe("");
  });
});
