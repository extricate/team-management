// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NieuwePositieForm } from "./NieuwePositieForm";
import { NIET_BESCHIKBAAR_TITEL } from "@/lib/functies";
import type { FunctieOption } from "@/components/ui/FunctieCombobox";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) =>
    <a href={href} {...rest}>{children}</a>,
}));
vi.mock("@rijkshuisstijl-community/components-react", () => ({
  Heading: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/ui/StatusBadge", () => ({ StatusBadge: () => null }));
vi.mock("@/lib/opf-types", () => ({
  OPF_TYPES: [],
  getOPFType: () => null,
  CATEGORY_LABELS: {},
  CATEGORY_BADGE_COLOR: {},
}));
// Mock the combobox as a plain <select> so tests can use native fireEvent.change
vi.mock("@/components/ui/FunctieCombobox", () => ({
  FunctieCombobox: ({ functies, value, onChange, id }: {
    functies: FunctieOption[];
    value: string;
    onChange: (id: string) => void;
    id?: string;
  }) => (
    <select
      id={id}
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label="Functie"
    >
      <option value="">— Selecteer functie —</option>
      {functies.map(f => <option key={f.id} value={f.id}>{f.titel}</option>)}
    </select>
  ),
}));

const organisations = [{ id: "org-1", name: "Organisatie A" }];

const NIET_BESCHIKBAAR_FUNCTIE: FunctieOption = { id: "nb-id", titel: NIET_BESCHIKBAAR_TITEL, schaalCode: null, isActive: true };
const REGULIERE_FUNCTIE: FunctieOption = { id: "reg-id", titel: "Software Engineer", schaalCode: "10", isActive: true };
const FUNCTIE_ZONDER_SCHAAL: FunctieOption = { id: "noscale-id", titel: "Adviseur", schaalCode: null, isActive: true };

const functies = [REGULIERE_FUNCTIE, FUNCTIE_ZONDER_SCHAAL, NIET_BESCHIKBAAR_FUNCTIE];

describe("NieuwePositieForm – functie selectie", () => {
  it("toont een dropdown voor functies", () => {
    render(<NieuwePositieForm organisations={organisations} functies={functies} />);
    expect(screen.getByLabelText(/functie/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/product owner/i)).not.toBeInTheDocument();
  });

  it("toont alle beschikbare functies in de dropdown", () => {
    render(<NieuwePositieForm organisations={organisations} functies={functies} />);
    expect(screen.getByRole("option", { name: "Software Engineer" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: NIET_BESCHIKBAAR_TITEL })).toBeInTheDocument();
  });
});

describe("NieuwePositieForm – roltitel veld", () => {
  it("verbergt het roltitel veld bij aanvang", () => {
    render(<NieuwePositieForm organisations={organisations} functies={functies} />);
    expect(screen.queryByLabelText(/roltitel/i)).not.toBeInTheDocument();
  });

  it("verbergt het roltitel veld wanneer een reguliere functie geselecteerd is", () => {
    render(<NieuwePositieForm organisations={organisations} functies={functies} />);
    fireEvent.change(screen.getByLabelText(/functie/i), { target: { value: "reg-id" } });
    expect(screen.queryByLabelText(/roltitel/i)).not.toBeInTheDocument();
  });

  it("toont het roltitel veld wanneer 'Niet beschikbaar' geselecteerd is", () => {
    render(<NieuwePositieForm organisations={organisations} functies={functies} />);
    fireEvent.change(screen.getByLabelText(/functie/i), { target: { value: "nb-id" } });
    expect(screen.getByLabelText(/roltitel/i)).toBeInTheDocument();
  });

  it("roltitel is verplicht wanneer 'Niet beschikbaar' geselecteerd is", () => {
    render(<NieuwePositieForm organisations={organisations} functies={functies} />);
    fireEvent.change(screen.getByLabelText(/functie/i), { target: { value: "nb-id" } });
    expect(screen.getByLabelText(/roltitel/i)).toHaveAttribute("required");
  });
});

describe("NieuwePositieForm – schaal en kosten", () => {
  it("verbergt schaal- en kostenvelden voor reguliere functies", () => {
    render(<NieuwePositieForm organisations={organisations} functies={functies} />);
    fireEvent.change(screen.getByLabelText(/functie/i), { target: { value: "reg-id" } });
    expect(screen.queryByLabelText(/^schaal$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/jaarlijkse kosten/i)).not.toBeInTheDocument();
  });

  it("toont schaal- en kostenvelden voor 'Niet beschikbaar'", () => {
    render(<NieuwePositieForm organisations={organisations} functies={functies} />);
    fireEvent.change(screen.getByLabelText(/functie/i), { target: { value: "nb-id" } });
    expect(screen.getByLabelText(/^schaal$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/jaarlijkse kosten/i)).toBeInTheDocument();
  });
});
