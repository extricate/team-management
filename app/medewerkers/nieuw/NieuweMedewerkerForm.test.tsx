// @vitest-environment jsdom
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NieuweMedewerkerForm } from "./NieuweMedewerkerForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@rijkshuisstijl-community/components-react", () => ({
  Heading: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
}));
vi.mock("@/components/ui/Breadcrumbs", () => ({ Breadcrumbs: () => null }));

const orgs = [
  { id: "org-a", name: "Organisatie A" },
  { id: "org-b", name: "Organisatie B" },
];

describe("NieuweMedewerkerForm – standaard organisatie", () => {
  it("pre-selecteert de standaard organisatie wanneer opgegeven", () => {
    render(<NieuweMedewerkerForm orgs={orgs} defaultOrganisationId="org-b" />);
    const select = screen.getByRole("combobox", { name: /organisatie/i }) as HTMLSelectElement;
    expect(select.value).toBe("org-b");
  });

  it("toont de placeholder wanneer geen standaard organisatie is ingesteld", () => {
    render(<NieuweMedewerkerForm orgs={orgs} defaultOrganisationId={null} />);
    const select = screen.getByRole("combobox", { name: /organisatie/i }) as HTMLSelectElement;
    expect(select.value).toBe("");
  });
});

describe("NieuweMedewerkerForm – personeelsnummer", () => {
  it("toont een veld voor personeelsnummer", () => {
    render(<NieuweMedewerkerForm orgs={orgs} defaultOrganisationId={null} />);
    expect(screen.getByLabelText(/personeelsnummer/i)).toBeInTheDocument();
  });

  it("stuurt personeelsnummer mee in het verzoek wanneer ingevuld", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { id: "emp-1" } }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<NieuweMedewerkerForm orgs={orgs} defaultOrganisationId="org-a" />);
    fireEvent.change(screen.getByLabelText(/voornaam/i), { target: { value: "Jan" } });
    fireEvent.change(screen.getByLabelText(/achternaam/i), { target: { value: "Jansen" } });
    fireEvent.change(screen.getByLabelText(/personeelsnummer/i), { target: { value: "P12345" } });

    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: /medewerker aanmaken/i }).closest("form")!);
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.personeelsnummer).toBe("P12345");

    vi.unstubAllGlobals();
  });

  it("stuurt geen personeelsnummer mee als het veld leeg is", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { id: "emp-1" } }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<NieuweMedewerkerForm orgs={orgs} defaultOrganisationId="org-a" />);
    fireEvent.change(screen.getByLabelText(/voornaam/i), { target: { value: "Jan" } });
    fireEvent.change(screen.getByLabelText(/achternaam/i), { target: { value: "Jansen" } });

    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: /medewerker aanmaken/i }).closest("form")!);
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.personeelsnummer).toBeUndefined();

    vi.unstubAllGlobals();
  });
});
