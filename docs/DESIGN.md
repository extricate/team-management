# Design System Reference

This document captures the design conventions used throughout the Teambeheer application.
All UI must follow the **Rijksoverheid Design Guidelines** as implemented by the
[NL Design System](https://nldesignsystem.nl/) and the
[@rijkshuisstijl-community/components-react](https://nl-design-system.github.io/rijkshuisstijl-community/) (RHC) library.

https://rijkshuisstijl-community.vercel.app/?path=/docs/rijkshuisstijl-community-readme--docs Rijkshuisstijl Community Storybook

---

## 1. Foundations

### Tokens

Use CSS custom properties from the RVO / RHC design tokens. Never hard-code colours or spacing
values that have a token equivalent.

| Token pattern | Examples |
|---|---|
| `--rvo-color-<name>-<shade>` | `--rvo-color-hemelblauw-700`, `--rvo-color-grijs-600`, `--rvo-color-groen-600` |
| `--rhc-text-font-size-<size>` | `sm` ≈ 0.8125 rem, `md` ≈ 1 rem, `lg` ≈ 1.25 rem, `xl` ≈ 1.5 rem, `2xl` ≈ 2 rem, `3xl` ≈ 3 rem |
| `--rhc-card-border-color` | resolves to `--rhc-color-cool-grey-300` (light grey) |
| `--rhc-border-radius-md` | 5 px — the standard card corner radius |

Always pair a token with a fallback for browsers that load the stylesheet before the token
sheet is ready:

```css
color: var(--rvo-color-grijs-600, #5a5a5a);
```

### Typography

| Use | Component / class |
|---|---|
| Page title | `<Heading level={1}>` (no `style={{ fontSize: … }})` |
| Section title | `<Heading level={2}>` |
| Card heading | `<Heading level={3}>` (or the `Card` component's `headingLevel={3}` prop) |
| Body text | `<Paragraph>` or plain `<p>` |
| Small caption / field label | `.field-label` utility class |

**Never override `Heading` font size with inline `style={{ fontSize: … }}`.**
The RHC `Heading` component maps each `level` to the correct token automatically.

---

## 2. RHC / Utrecht components

Import from `@rijkshuisstijl-community/components-react`.
Use these instead of hand-rolled equivalents wherever they exist.

| Need | Component |
|---|---|
| Section / content card | `Card` (with `headingLevel` + `style={{ maxInlineSize: "none", width: "100%" }}` to override the 328 px max-width) |
| Navigation list in a card | `LinkListCard` + `LinkList` + `LinkListLink` |
| Page heading | `Heading` |
| Body text | `Paragraph` |

### `Card` max-width gotcha

The RHC `Card` component has `display: inline-flex` and `max-inline-size: 328px` by default.
For full-width cards, always add:

```tsx
<Card
  heading="…"
  headingLevel={2}
  style={{ maxInlineSize: "none", width: "100%" }}
>
```

---

## 3. Custom component library (`components/ui`)

All components are re-exported from `components/ui/index.ts`.

### Site chrome

| Component | Props | Notes |
|---|---|---|
| `SiteHeader` | `userName?: string` | Server component. Composes `SiteHeaderNav`, `SearchBar`, `NotificationBell`, `UserMenu`. |
| `SiteHeaderNav` | — | Client component. Primary nav: Dashboard, Teams, Posities, Medewerkers, Financiering, Bestellingen. Secondary links (Organisaties, Bedrijfspersex) under a "Meer" dropdown. |
| `SiteFooter` | — | Three-column footer with site links and copyright. |
| `UserMenu` | `userName?: string`, `onLogout: () => Promise<void>` | Client component. Avatar button that opens a dropdown with navigation and logout. |

### Navigation & breadcrumbs

```tsx
import { Breadcrumbs } from "@/components/ui";

// Crumb type: { label: string; href?: string }
<Breadcrumbs crumbs={[
  { label: "Teams", href: "/teams" },
  { label: team.name },          // last crumb has no href — rendered as plain text
]} />
```

The component always prepends a "Home → /dashboard" root crumb automatically.

### Status badge

```tsx
import { StatusBadge } from "@/components/ui";
<StatusBadge label="BP" color="purple" />
```

| Semantic | `color` |
|---|---|
| Active / complete / positive | `green` |
| Warning / pending / partially funded | `orange` |
| Informational / numeric | `blue` |
| Neutral / inactive / unknown | `grey` |
| Error / rejected / negative | `red` |
| Bedrijfspersex (BP) source | `purple` |

### Currency display

```tsx
import { CurrencyDisplay } from "@/components/ui";
<CurrencyDisplay value={123456.78} />           // compact with abbreviation tooltip
<CurrencyDisplay value={123456.78} compact={false} /> // always full format
```

When compact mode abbreviates (e.g. "€ 123K"), the full value appears as an `<abbr>` tooltip.

### Pagination

```tsx
import { Pagination } from "@/components/ui";
<Pagination
  currentPage={page}
  totalPages={Math.ceil(total / PAGE_SIZE)}
  buildHref={(p) => `/teams?page=${p}`}
/>
```

Renders nothing when `totalPages <= 1`.

### Sort header

Use inside `<th>` position in Utrecht tables:

```tsx
import { SortHeader } from "@/components/ui";
<SortHeader
  label="Naam"
  column="name"
  currentSort={sort}
  currentOrder={order}
  buildHref={(col, ord) => `/teams?sort=${col}&order=${ord}`}
/>
```

Appends ↑ / ↓ / ↕ indicator and links to the toggled sort URL.

### Search bar

```tsx
import { SearchBar } from "@/components/ui";
<SearchBar />
```

Client component. Uses Meilisearch via `/api/search`. Renders a combobox with live results.
Already included in `SiteHeader` — do not add a second instance.

### Notification bell

```tsx
import { NotificationBell } from "@/components/ui";
<NotificationBell />
```

Client component with a live badge. Already included in `SiteHeader`.

### Print button

```tsx
import { PrintButton } from "@/components/ui";
<PrintButton />
<PrintButton label="Exporteer" />  // optional label override
```

Calls `window.print()`. Default label: "Afdrukken".

### Archived banner

Shown at the top of a detail page when the entity has been soft-deleted:

```tsx
import { ArchivedBanner } from "@/components/ui";
<ArchivedBanner deletedAt={entity.deletedAt} entityLabel="medewerker" />
```

Renders a yellow/amber info bar with the archive date.

### Archive button

Trigger a DELETE request with a confirm dialog:

```tsx
import { ArchiveButton } from "@/components/ui";
<ArchiveButton
  entityName="Jan Janssen"
  apiPath={`/api/employees/${id}`}
  redirectTo="/medewerkers"     // optional: navigate after success
  warningText="…"               // optional: extra warning in the dialog
  size="sm"                     // optional: compact variant
/>
```

Uses `.confirm-dialog` pattern (see §6).

### Decouple position button

Removes the team–position coupling with a confirm dialog:

```tsx
import { DecouplePositionButton } from "@/components/ui";
<DecouplePositionButton
  couplingId={coupling.id}
  positionName={position.type}
  size="sm"
/>
```

### Remove funding button

Removes a funding allocation with a confirm dialog:

```tsx
import { RemoveFundingButton } from "@/components/ui";
<RemoveFundingButton allocationId={allocation.id} sourceName={source.name} />
```

### Transfer button (financial source)

Transfers a financial source to another organisation:

```tsx
import { TransferButton } from "@/components/ui";
<TransferButton
  sourceId={source.id}
  sourceName={source.name}
  currentOrgId={source.organisationId}
/>
```

Fetches available organisations on open and presents a select dialog.

### Transfer position button

Moves a position coupling to another team:

```tsx
import { TransferPositionButton } from "@/components/ui";
<TransferPositionButton
  positionId={position.id}
  positionName={position.type}
  currentTeamId={teamId}
  activeCouplingId={coupling.id}
/>
```

### Position actions menu (kebab)

Three-dot action menu for a position card. Bundles Financieren, Bewerken, Overzetten, Loskoppelen, and Archiveren into a single dropdown:

```tsx
import { PositionActionsMenu } from "@/components/ui";
<PositionActionsMenu
  positionId={position.id}
  positionType={position.type}
  teamId={teamId}
  couplingId={coupling.id}
  financierenHref={`…/financieren`}
  bewerkenHref={`…/bewerken`}
/>
```

Uses the `.actions-menu__*` CSS classes (see §7).

### Comment section

Threaded comments on any entity:

```tsx
import { CommentSection } from "@/components/ui";
<CommentSection
  comments={comments}
  commentableType="position"   // "team" | "position" | "employee" | "financial_source"
  commentableId={position.id}
  currentUserId={session.user.id}
/>
```

### Audit log

Display the event history for an entity:

```tsx
import { AuditLog } from "@/components/ui";
<AuditLog events={auditEvents} />
```

`events` is the array returned by `/api/audit-events?entityType=…&entityId=…`.

### Page skeleton (loading)

Server-rendered loading placeholder while a Suspense boundary resolves:

```tsx
import { PageSkeleton } from "@/components/ui";
<PageSkeleton />                   // default: table layout
<PageSkeleton variant="detail" />  // detail page layout
```

Use inside `loading.tsx` files.

### Filterable tables

Client-side tables with show/hide inactive toggle:

```tsx
import { FilterableMembershipsTable } from "@/components/ui";
<FilterableMembershipsTable employeeId={id} memberships={memberships} />

import { FilterableTeamMembersTable } from "@/components/ui";
<FilterableTeamMembersTable teamId={id} memberships={memberships} />
```

### Drag-and-drop builders

Full-page interactive assignment tools. These are heavy client components — only use on dedicated `/indelen` pages.

```tsx
import { DragDropTeamBuilder } from "@/components/ui";
<DragDropTeamBuilder employees={employees} teams={teams} />

import { DragDropPositionBuilder } from "@/components/ui";
<DragDropPositionBuilder employees={employees} teams={teams} positions={positions} />
```

### Budget grid editor

Interactive year × category grid for entering financial amounts per financial source:

```tsx
import { BudgetGridEditor } from "@/components/ui";
<BudgetGridEditor
  sourceId={source.id}
  initialEntries={entries}
  initialYears={years}
/>
```

---

## 4. Buttons

Use Utrecht button classes via `className`. Never write custom button CSS.

| Variant | `className` |
|---|---|
| Primary action | `utrecht-button utrecht-button--primary-action` |
| Secondary action | `utrecht-button utrecht-button--secondary-action` |
| Destructive (delete / archive) | `utrecht-button utrecht-button--danger` |
| Compact variant (dense contexts) | add `utrecht-button--sm` to any button |

**Do not prefix button labels with `+`, `→`, or other decorative symbols.**
The button's position and context make its purpose clear.

---

## 5. Links

```tsx
<Link href="…" className="utrecht-link">Label</Link>
```

Use `className="utrecht-link"` for inline text links within body copy and table cells.
Use button classes (`utrecht-button--primary-action` etc.) when the link represents an action.

---

## 6. Layout patterns

### Page-level layout

```tsx
{/* Page header: title + primary action */}
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
  <Heading level={1} style={{ margin: 0 }}>…</Heading>
  <Link href="/…/nieuw" className="utrecht-button utrecht-button--primary-action">Nieuw item</Link>
</div>
```

The outer shell is a `.page-wrapper` flex column (header → `<main>` → footer). The `<main>`
element is already constrained to `max-width: 1200px` — do not add extra wrappers around page
content.

Form pages use `.form-page` to cap width at 640 px:

```tsx
<main>
  <div className="form-page">
    {/* form content */}
  </div>
</main>
```

### Stat tiles (KPI overview)

Use the `.stat-tiles` / `.stat-tile` / `.stat-tile__value` / `.stat-tile__label` utility classes
defined in `globals.css`.

```tsx
<div className="stat-tiles">
  {stats.map(({ label, value }) => (
    <div key={label} className="stat-tile">
      <strong className="stat-tile__value">{value}</strong>
      <span className="stat-tile__label">{label}</span>
    </div>
  ))}
</div>
```

- Value is displayed **above** the label (large bold number on top, descriptive caption below).
- Clickable stat tiles: use `<Link>` instead of `<div>` — the `a.stat-tile:hover` rule applies automatically.
- The grid is `repeat(auto-fill, minmax(170px, 1fr))` — tiles wrap naturally at small widths.

### Position cards

Use the `.position-card` family of classes for cards that display a position with a header band
and a two-column body grid.

```tsx
<div className="position-card">
  <div className="position-card__header">
    {/* title, badges, action buttons */}
  </div>
  <div className="position-card__body">
    {/* two-column grid content */}
  </div>
</div>
```

Inside `position-card__body`, use `.field-label` for the small grey caption above each value:

```tsx
<div className="field-label">Bezet door</div>
<div>{value}</div>
```

Progress bar within a position card:

```tsx
<div className="progress-bar">
  <div
    className="progress-bar__fill"
    style={{ width: `${pct}%`, background: "var(--rvo-color-groen-600)" }}
  />
</div>
```

The bar colour is the only inline style needed — everything else (height, radius, transition)
comes from the CSS classes.

---

## 7. CSS utility class reference (`globals.css`)

These are the project-defined BEM classes. Use them instead of writing new CSS.

### Actions menu (kebab dropdown)

```tsx
<div style={{ position: "relative" }}>
  <button className="actions-menu__trigger" aria-expanded={open} aria-haspopup="menu">⋮</button>
  {open && (
    <div className="actions-menu__dropdown">
      <Link href="…" className="actions-menu__item">Bewerken</Link>
      <div className="actions-menu__divider" />
      <button className="actions-menu__item actions-menu__item--danger">Verwijderen</button>
    </div>
  )}
</div>
```

| Class | Purpose |
|---|---|
| `.actions-menu__trigger` | Ghost icon-button, 32 × 32 px, invisible at rest |
| `.actions-menu__dropdown` | Absolutely-positioned white card, `z-index: 100` |
| `.actions-menu__item` | Full-width item (button or link) |
| `.actions-menu__item--danger` | Red danger colour for destructive items |
| `.actions-menu__divider` | 1 px horizontal separator |

**Important**: The `.position-card` intentionally has no `overflow: hidden` so the dropdown can overflow its card boundary.

### Confirm dialog

```tsx
<dialog ref={ref} className="confirm-dialog" aria-labelledby={titleId}>
  <div className="confirm-dialog__content">
    <p id={titleId} className="confirm-dialog__title">Bevestigen</p>
    <p className="confirm-dialog__body">Weet je zeker dat je … wilt …?</p>
    <div className="confirm-dialog__actions">
      <button className="utrecht-button utrecht-button--secondary-action">Annuleren</button>
      <button className="utrecht-button utrecht-button--danger">Bevestigen</button>
    </div>
  </div>
</dialog>
```

Use the `ArchiveButton` / `DecouplePositionButton` etc. as reference — do not build custom confirm dialogs for standard destructive actions.

### Other utility classes

| Class | Purpose |
|---|---|
| `.field-label` | Small grey caption (`font-size: sm`, `color: grijs-600`) above a field value |
| `.page-loading` | Centered loading placeholder (3 rem padding, muted text) |
| `.skip-link` | Visually hidden "skip to content" accessibility link; revealed on focus |
| `.form-required` | Red asterisk for required field markers |

---

## 8. Forms

All form inputs use the Utrecht form component classes:

```html
<input  class="utrecht-textbox" />
<select class="utrecht-select" />
<textarea class="utrecht-textarea" />
```

Field structure:

```tsx
<div className="form-field">
  <label htmlFor="name">
    Naam <span className="form-required">*</span>
  </label>
  <span className="form-hint">Voer de volledige naam in.</span>
  <input id="name" className="utrecht-textbox" />
</div>
```

Form action row:

```tsx
<div className="form-actions">
  <button type="submit" className="utrecht-button utrecht-button--primary-action">Opslaan</button>
  <Link href="…" className="utrecht-button utrecht-button--secondary-action">Annuleren</Link>
</div>
```

Filter bars (on list pages) use a flex row:

```tsx
<form method="get" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
  …
  <button type="submit" className="utrecht-button utrecht-button--secondary-action">Filteren</button>
  {hasFilters && <Link href="…" className="utrecht-link">× Wis filter</Link>}
</form>
```

---

## 9. Tables

Use the Utrecht table BEM classes:

```html
<table class="utrecht-table">
  <thead class="utrecht-table__header">
    <tr class="utrecht-table__row">
      <th class="utrecht-table__header-cell">…</th>
    </tr>
  </thead>
  <tbody class="utrecht-table__body">
    <tr class="utrecht-table__row">
      <td class="utrecht-table__cell">…</td>
    </tr>
  </tbody>
</table>
```

For sortable columns use `<SortHeader>` from `components/ui/SortHeader.tsx` (see §3).

---

## 10. Alerts and feedback

| Situation | Class |
|---|---|
| Error / validation failure | `.form-alert` |
| Success | `.form-alert form-alert--success` |
| Loading state | `.page-loading` |

---

## 11. Do's and Don'ts

### Do
- Use design tokens for every colour and spacing value.
- Use RHC / Utrecht component classes; extend in `globals.css` only when no component exists.
- Keep all reusable CSS in `globals.css` as BEM utility classes.
- Use `.stat-tile`, `.position-card`, `.field-label`, `.progress-bar` for the patterns they cover.
- Pair every token with a fallback hex value.
- Use `<ArchiveButton>`, `<DecouplePositionButton>`, `<RemoveFundingButton>` for destructive actions — they handle confirm dialogs consistently.
- Use `<CurrencyDisplay>` for all euro amounts so compact/full format stays consistent.
- Use `<PageSkeleton>` inside `loading.tsx` files instead of custom spinners.

### Don't
- Override `Heading` font sizes with inline `style={{ fontSize: … }}`.
- Prefix button or link labels with symbols (`+`, `→`, `⚠️`, etc.).
- Hard-code colours that have a `--rvo-color-*` equivalent.
- Use `<div class="rhc-card rhc-card--default">` raw HTML to build cards — use the `Card` React component.
- Forget `style={{ maxInlineSize: "none", width: "100%" }}` when using `Card` for full-width sections.
- Set `display: flex` on table cells for layout tricks (breaks alignment); use a wrapping `<div>` inside the cell instead, or rely on table layout.
- Add a second `<SearchBar>` or `<NotificationBell>` — they are already in `SiteHeader`.
- Build custom confirm dialogs for standard destructive actions — use the existing button components.
