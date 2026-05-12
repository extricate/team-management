# Design System Reference

This document captures the design conventions used throughout the Teambeheer application.
All UI must follow the **Rijksoverheid Design Guidelines** as implemented by the
[NL Design System](https://nldesignsystem.nl/) and the
[@rijkshuisstijl-community/components-react](https://nl-design-system.github.io/rijkshuisstijl-community/) (RHC) library.

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

## 2. Components

### RHC / Utrecht components

Import from `@rijkshuisstijl-community/components-react`.
Use these instead of hand-rolled equivalents wherever they exist.

| Need | Component |
|---|---|
| Section / content card | `Card` (with `headingLevel` + `style={{ maxInlineSize: "none", width: "100%" }}` to override the 328 px max-width) |
| Navigation list in a card | `LinkListCard` + `LinkList` + `LinkListLink` |
| Page heading | `Heading` |
| Body text | `Paragraph` |

#### `Card` max-width gotcha

The RHC `Card` component has `display: inline-flex` and `max-inline-size: 328px` by default.
For full-width cards, always add:

```tsx
<Card
  heading="…"
  headingLevel={2}
  style={{ maxInlineSize: "none", width: "100%" }}
>
```

### Buttons

Use Utrecht button classes via `className`. Never write custom button CSS.

| Variant | `className` |
|---|---|
| Primary action | `utrecht-button utrecht-button--primary-action` |
| Secondary action | `utrecht-button utrecht-button--secondary-action` |
| Destructive (delete) | `utrecht-button--danger` (defined in `globals.css`) |

**Do not prefix button labels with `+`, `→`, or other decorative symbols.**
The button's position and context make its purpose clear.

### Links

```tsx
<Link href="…" className="utrecht-link">Label</Link>
```

Use `className="utrecht-link"` for inline text links within body copy and table cells.
Use button classes (`utrecht-button--primary-action` etc.) when the link represents an action.

---

## 3. Layout patterns

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

### Page-level layout

```tsx
{/* Page header: title + primary action */}
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
  <Heading level={1} style={{ margin: 0 }}>…</Heading>
  <Link href="/…/nieuw" className="utrecht-button utrecht-button--primary-action">Nieuw item</Link>
</div>
```

---

## 4. Status badges

Use `<StatusBadge label="…" color="…" />` from `components/ui/StatusBadge.tsx`.

| Semantic | `color` |
|---|---|
| Active / complete / positive | `green` |
| Warning / pending / partially funded | `orange` |
| Informational / numeric | `blue` |
| Neutral / inactive / unknown | `grey` |
| Error / rejected / negative | `red` |
| Bedrijfspersex (BP) source | `purple` |

```tsx
<StatusBadge label="BP" color="purple" />
<StatusBadge label={`${pct}%`} color={pct >= 100 ? "green" : pct > 0 ? "orange" : "grey"} />
```

---

## 5. Forms

All form inputs use the Utrecht form component classes:

```html
<input  class="utrecht-textbox" />
<select class="utrecht-select" />
<textarea class="utrecht-textarea" />
```

Field labels use the `.form-field` / `label` / `.form-hint` pattern from `globals.css`.
Use `<span class="form-required">*</span>` for required field markers.

Filter bars (on list pages) use a flex row:

```tsx
<form method="get" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
  …
  <button type="submit" className="utrecht-button utrecht-button--secondary-action">Filteren</button>
  {hasFilters && <Link href="…" className="utrecht-link">× Wis filter</Link>}
</form>
```

---

## 6. Tables

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

For sortable columns use `<SortHeader>` from `components/ui/SortHeader.tsx`.

---

## 7. Alerts and feedback

| Situation | Class |
|---|---|
| Error / validation failure | `.form-alert` |
| Success | `.form-alert form-alert--success` |
| Loading state | `.page-loading` |

---

## 8. Do's and Don'ts

### Do
- Use design tokens for every colour and spacing value.
- Use RHC / Utrecht component classes; extend in `globals.css` only when no component exists.
- Keep all reusable CSS in `globals.css` as BEM utility classes.
- Use `.stat-tile`, `.position-card`, `.field-label`, `.progress-bar` for the patterns they cover.
- Pair every token with a fallback hex value.

### Don't
- Override `Heading` font sizes with inline `style={{ fontSize: … }}`.
- Prefix button or link labels with symbols (`+`, `→`, `⚠️`, etc.).
- Hard-code colours that have a `--rvo-color-*` equivalent.
- Use `<div class="rhc-card rhc-card--default">` raw HTML to build cards — use the `Card` React component.
- Forget `style={{ maxInlineSize: "none", width: "100%" }}` when using `Card` for full-width sections.
- Set `display: flex` on table cells for layout tricks (breaks alignment); use wrapping `<div>` inside the cell instead, or rely on table layout.
