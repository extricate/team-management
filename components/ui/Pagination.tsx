import Link from "next/link";

interface Props {
  currentPage: number;
  totalPages: number;
  /** Called with a page number, returns the href for that page. */
  buildHref: (page: number) => string;
}

export function Pagination({ currentPage, totalPages, buildHref }: Props) {
  if (totalPages <= 1) return null;

  const pages = buildPageList(currentPage, totalPages);

  return (
    <nav
      aria-label="Paginering"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "0.25rem",
        marginTop: "1.5rem",
        flexWrap: "wrap",
      }}
    >
      <PageButton
        href={currentPage > 1 ? buildHref(currentPage - 1) : undefined}
        label="← Vorige"
      />

      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`ellipsis-${i}`}
            style={{ padding: "0.375rem 0.5rem", color: "var(--rvo-color-grijs-600)" }}
          >
            …
          </span>
        ) : (
          <PageButton
            key={p}
            href={buildHref(p)}
            label={String(p)}
            active={p === currentPage}
            ariaCurrent={p === currentPage ? "page" : undefined}
          />
        )
      )}

      <PageButton
        href={currentPage < totalPages ? buildHref(currentPage + 1) : undefined}
        label="Volgende →"
      />
    </nav>
  );
}

function PageButton({
  href,
  label,
  active,
  ariaCurrent,
}: {
  href?: string;
  label: string;
  active?: boolean;
  ariaCurrent?: "page";
}) {
  const base: React.CSSProperties = {
    padding: "0.375rem 0.625rem",
    fontSize: "0.875rem",
    minWidth: "2.25rem",
    textAlign: "center",
    textDecoration: "none",
    display: "inline-block",
  };

  if (!href) {
    return (
      <span
        className="utrecht-button utrecht-button--secondary-action"
        aria-disabled="true"
        style={{ ...base, opacity: 0.4, cursor: "default" }}
      >
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={
        active
          ? "utrecht-button utrecht-button--primary-action"
          : "utrecht-button utrecht-button--secondary-action"
      }
      style={base}
      aria-current={ariaCurrent}
    >
      {label}
    </Link>
  );
}

function buildPageList(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");

  pages.push(total);
  return pages;
}
