# Teambeheer — Architectural Design Document

**Version:** 1.3  
**Last updated:** May 2026  
**Audience:** Engineers, tech leads

---

## 1. Purpose and Scope

Teambeheer is an internal web application for Dutch government organisations (Rijksoverheid) to manage team composition, workforce planning, and financial allocation. Its primary goals are:

1. **Visibility** — see at a glance how teams are composed, how many positions are filled, planned, or open, and what funding is backing each position.
2. **Financial accountability** — track where budget comes from (financial sources), what it is allocated to (positions or teams), and provide a full audit trail of reallocations so future leaders can reconstruct every financial decision.
3. **Temporal integrity** — all assignments and allocations are date-ranged; the system can answer "what was the state of team X on date Y?" without losing historical data.
4. **Auditability** — every mutation records before/after state, the acting user, and an optional reason.

The application is scoped to authenticated internal users. It does not expose a public API.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server Components by default |
| Language | TypeScript 5 | Strict mode |
| Database | PostgreSQL 16 | Direct connection (no Supabase) |
| ORM | Drizzle ORM | Type-safe, schema-first |
| Auth | NextAuth.js v5 (beta) | Credentials (username/password + TOTP MFA). No external mail service — fully offline. |
| UI Library | @rijkshuisstijl-community/components-react v15 | NL Design System / Rijksoverheid |
| Validation | Zod | Schema validation at API boundary |
| Testing | Vitest | Unit + route integration tests |
| Deployment | Docker (self-hosted) | Offline enterprise network — no external services required |

---

## 3. Domain Model

### 3.1 Entity Relationship Overview

```
Organisation
 ├──< Team
 │    ├──< TeamPositionCoupling >── Position ──< PositionAssignment >── Employee
 │    ├──< TeamMembership >── Employee
 │    └──< FundingAllocation (team-level)
 ├──< Employee
 ├──< Bestelling (ATB order, categorised by BestellingType)
 │    └──< Position (optional: position linked to a bestelling)
 └──< FinancialSource
      └──< FinancialSourceAmount
           └──< FundingAllocation → Position | Team | Bestelling | CompanyPersexBudget

CompanyPersexBudget (singleton per year, government-wide personnel budget)
 └──< FundingAllocation

Salarisschaal (salary grade lookup table, schaalCode × year)
```

Positions belong to an organisation and are associated with a team via the temporal `TeamPositionCoupling` junction. A position may be recoupled to a different team over time.

### 3.2 Entity Descriptions

**Organisation**  
Top-level container. Type is either OS1 or OS2 (organisation structure classifications). All teams, employees, and financial sources belong to one organisation.

**Team**  
A group within an organisation. Has many positions and many employees (via TeamMembership). Teams can receive team-level funding allocations (for overhead, training, etc.).

**Employee**  
A person employed in the organisation. Belongs to one organisation but can be a member of multiple teams over time (via TeamMembership). Holds positions over time (via PositionAssignment).

**Position**  
A role slot within an organisation, associated with a team via `TeamPositionCoupling`. Status lifecycle: `gepland → gewenst → toegezegd → open → gevuld → gesloten`. A position can be filled by multiple employees sequentially (never concurrently). The `positionCode` is an optional external reference (e.g. from HR systems). `opfType` holds the OPF classification key (e.g. "OPF1", "OPF9-inhuur"). The optional `requiredBefore` date signals the deadline by which the position must be staffed — used by the dashboard conflict detector to flag late starts. A position may optionally be linked to a `Bestelling` to represent an external order driving the position.

**TeamPositionCoupling**  
Temporal junction between Position and Team. Records which team a position belongs to at any point in time, with a `startDate` and nullable `endDate`. A position can be recoupled to a different team by ending the current coupling and creating a new one. Current coupling: `endDate IS NULL`.

**TeamMembership**  
Junction between Employee and Team, with a date range (`startDate`/`endDate`) and a `status`. Represents "employee X was a member of team Y from date A to date B". Historical memberships are retained.

**PositionAssignment**  
Junction between Employee and Position, with date range and `reason`. Represents "employee X held position Y from date A". Used for both current assignments and the full history.

**FinancialSource**  
Represents a funding stream (e.g. a project budget identified by a `projectId`). Belongs to an organisation. Broken down into types and amounts.

**FinancialType**  
A categorisation of money within a source: `PERSEX` (personnel expenses), `MATEX` (material expenses), or `Investeringen` (investments), tied to a specific year.

**FinancialSourceAmount**  
A specific amount within a source, tied to a financial type. Status is `concept` until formally `released`. Has effective and release dates.

**Bestelling**  
An ATB (Aanvraag Tot Bestelling) procurement order. Belongs to an organisation and is categorised by a `BestellingType`. Carries an `atbNummer`, `geraamdBedrag` (estimated amount), and optional `werkelijkBedrag` (actual amount). Bestellingen are soft-deleted and fully audited.

**BestellingType**  
Lookup table categorising bestellingen (e.g. "Inhuur", "Investering"). Each bestelling references exactly one type.

**Salarisschaal**  
Reference table for salary grade cost data. Keyed by `schaalCode` × `year` (unique index). Stores `primaryCost`, `secondaryEffects`, and `tertiaryEffects`. Used for workforce cost planning. Lookups fall back to the nearest available year when an exact match is not found.

**CompanyPersexBudget**  
Government-wide personnel expense budget, one record per year. Carries a total `amount` and a `status` (`concept` or `released`). Funding allocations can draw from this budget instead of from a project-specific financial source.

**FundingAllocation**  
Links a `FinancialSourceAmount` or a `CompanyPersexBudget` to a target: a `Position`, a `Team`, or a `Bestelling`. Exactly one source and one target must be set (validated via Zod `.refine()`). Supports partial allocations via `amount` and `percentage`. Status tracks `active → reallocated | expired`. The original allocation is never deleted — it is marked `reallocated` and a new allocation is created. This is the cornerstone of financial traceability.

**Comment**  
Polymorphic comment on any entity (team, employee, position, financialSource, fundingAllocation, bestelling, teamMembership, positionAssignment). Stored with `commentableType` + `commentableId` discriminator.

**AuditEvent**  
Append-only log of every mutation. Stores `beforeJson` and `afterJson` snapshots, the acting user, the action type, and an optional reason. Never updated or deleted.

### 3.3 Key Constraints

- A Position is associated with a team via `TeamPositionCoupling`. The current team is the coupling with `endDate IS NULL`. Positions can be recoupled to a different team by ending the current coupling.
- A FundingAllocation must reference exactly one source (`financialSourceAmountId` or `companyPersexBudgetId`) and exactly one target (`positionId`, `teamId`, or `bestellingId`), validated via Zod `.refine()`.
- A `Salarisschaal` is unique by `(schaalCode, year)`.
- A `CompanyPersexBudget` is unique by `year` (one row per calendar year).
- Historical integrity is enforced by retaining all records with `endDate`; state at any point in time is derivable.
- Soft delete: all major entities have a `deletedAt` column; deletion sets this timestamp rather than removing the row.

### 3.4 Status Lifecycles

```
Position:   gepland → gewenst → toegezegd → open → gevuld → gesloten
Membership: active → ended
Allocation: active → reallocated | expired
Amount:     concept → released
```

---

## 4. Frontend Architecture

### 4.1 Next.js App Router Patterns

All page files (`app/**/page.tsx`) are **React Server Components** by default. This means:

- Data fetching happens on the server with direct Drizzle queries (no client-side `fetch` for initial data).
- No need for API routes for page rendering — they exist only as the REST interface.
- Client components (`"use client"`) are used only where interactivity is required (forms with validation state, comment sections, drag-and-drop interfaces, navigation active state).
- `export const metadata` and `export async function generateMetadata()` are supported only on Server Components. All pages export a title so every view has a meaningful browser tab/search snippet.

### 4.2 Component Hierarchy

```
app/layout.tsx (Server)
└── SiteHeader (Server) — wraps SiteHeaderNav (Client, uses usePathname)
└── <page> (Server) — queries DB, renders data
    └── CommentSection (Client) — manages local comment state
    └── EditForm (Client) — manages form state, POSTs to API routes
    └── DragDropTeamBuilder (Client) — HTML5 drag-and-drop team builder
└── SiteFooter (Server)
```

### 4.3 Server vs Client Boundary

| Component | Type | Reason |
|---|---|---|
| `SiteHeader` | Server | Defines server action for sign-out |
| `SiteHeaderNav` | Client | Uses `usePathname` for active state |
| Page components (`page.tsx`) | Server | Direct DB queries, metadata export |
| `CommentSection` | Client | Optimistic updates, local state |
| `AuditLog` | Server | Read-only display |
| `StatusBadge` | Server | Pure presentational |
| `SortHeader` | Server | Pure presentational (renders an `<a>` link) |
| Create/Edit forms (`*Form.tsx`) | Client | Form state, validation, API calls |
| `DragDropTeamBuilder` | Client | HTML5 DnD, optimistic moves, fetch calls |

### 4.4 Form Pattern

Create/edit forms are client components that:
1. Receive prerequisite data as props (fetched by the server page wrapper)
2. Manage local form state and validation errors
3. `POST`/`PATCH` to the REST API routes
4. Redirect with `router.push()` on success

**Edit page pattern** (two files):
```
app/teams/[id]/bewerken/
├── page.tsx     — Server Component: fetches team, exports generateMetadata, renders EditForm
└── EditForm.tsx — Client Component: form pre-filled with team data
```

**Create page pattern** (two files — server wrapper + client form):
```
app/teams/nieuw/
├── page.tsx          — Server Component: fetches org list, exports metadata, renders NieuwTeamForm
└── NieuwTeamForm.tsx — Client Component: form state, org list passed as props
```

This split is required because `export const metadata` cannot coexist with `"use client"`. The server wrapper fetches any prerequisite data (e.g. org dropdowns) and passes it as props to the client form component, avoiding a client-side `useEffect` fetch waterfall.

### 4.5 Sorting and Filtering on List Pages

All list pages (`/teams`, `/medewerkers`, `/financiering`, `/organisaties`) support server-rendered sorting and filtering via URL search parameters. No client-side JavaScript is needed.

**URL params:** `?sort=<column>&order=asc|desc&q=<search>&<entityFilter>=<value>&page=<n>`

**`SortHeader` component** (`components/ui/SortHeader.tsx`) renders a `<th>` with an `<a>` link. Clicking it navigates to the same URL with the updated sort column and order, toggling direction if the column is already active. An arrow icon (↑ ↓ ↕) gives visual feedback.

```tsx
<SortHeader label="Naam" column="name" currentSort={sort} currentOrder={order} buildHref={buildHref} />
```

`buildHref(column, order)` is defined inline in each page and merges the new sort into existing filter params so sort changes don't reset filters or pagination.

**Filter forms** use native HTML `<form method="get">`. Submission rewrites the URL with the filter values, implicitly resetting to page 1. A "Wis filter" link points to the bare list URL.

**Text search** uses Drizzle `ilike()` against relevant string columns (name, first/last name, etc.), wrapped in `or()` for multi-column matching.

### 4.6 Data Access Pattern

Pages query the database directly via Drizzle:

```typescript
// In a Server Component page
const team = await db.query.teams.findFirst({
  where: and(eq(teams.id, params.id), isNull(teams.deletedAt)),
  with: {
    organisation: true,
    positions: { where: isNull(positions.deletedAt), with: { assignments: true } },
    memberships: { with: { employee: true } },
  },
});
```

The REST API routes (`app/api/`) are the interface for:
- Client components (forms, comment section, drag-and-drop team builder)
- External integrations (future)
- Testing (Vitest mocks the API layer)

### 4.7 Dashboard Analytics Module

`lib/dashboard.ts` contains pure business-logic functions used by `app/dashboard/page.tsx`. Extracting these into a separate module makes them unit-testable without a database.

**`detectPositionConflicts(positions)`** → `PositionConflict[]`

Scans positions and returns conflict objects of two types:
- `late_start` — `expectedStart` is after `requiredBefore` (position will miss its staffing deadline)
- `unfunded` — status is `planned` or `open` but has no `FundingAllocation` with `status = 'active'`

Closed positions are skipped entirely. Each conflict carries `positionId`, `positionType`, `teamName`, and a `type` discriminant.

**`collectUpcomingEvents(positions, memberships, assignments, now, minDays, maxDays)`** → `UpcomingEvent[]`

Aggregates upcoming events within a configurable day window (default 0–90 days):
- `position_start` — planned/open position with an `expectedStart` date
- `position_end` — any position with an `expectedEnd` date
- `membership_end` — active `TeamMembership` with an `endDate` approaching
- `assignment_end` — active `PositionAssignment` with an `endDate` approaching

Returns events sorted chronologically. Each event carries `kind`, `daysUntil`, `label`, `teamName`, and supporting display fields.

### 4.8 Printable Team Overview

`app/teams/[id]/overzicht/page.tsx` is a server-rendered print-friendly overview page for department events. It renders a two-column grid:
- Left: table of active team members (name, assigned position, member-since date)
- Right: table of positions (title, occupant, status badge)

A "Afdrukken" button triggers `window.print()` via an inline `<script>`. `@media print` CSS hides navigation and the button (`no-print` class). The page is suitable for printing to PDF or paper without any client-side state.

### 4.9 Drag-and-Drop Team Builder

`components/ui/DragDropTeamBuilder.tsx` is a client component that lets users reassign employees to teams by dragging and dropping, without navigating to individual employee pages.

**API flow on drop:**
1. If the employee has a current membership: `PATCH /api/team-memberships/:id` → `{ status: "ended", endDate: today }`
2. If moving to a new team (not unassigning): `POST /api/team-memberships` → new active membership
3. Optimistic state update in React before the API responds; errors displayed inline per employee card

**`/indelen` page** (`app/indelen/page.tsx`) is the server wrapper that:
- Fetches all organisations the user can access
- Renders an org selector if multiple orgs exist (URL param `?orgId=`)
- Queries all teams and employees for the selected org
- Derives current membership state and passes `DndEmployee[]` + `DndTeam[]` to `DragDropTeamBuilder`

---

## 5. Backend Architecture

### 5.1 API Route Structure

```
/api/organisations               GET (list), POST (create)
/api/organisations/[id]          GET, PATCH, DELETE
/api/teams                       GET, POST
/api/teams/[id]                  GET, PATCH, DELETE
/api/teams/bulk                  POST (bulk create by name array)
/api/employees                   GET, POST
/api/employees/[id]              GET, PATCH, DELETE
/api/positions                   GET, POST
/api/positions/[id]              GET, PATCH, DELETE
/api/position-assignments        POST
/api/team-memberships            GET, POST, PATCH (used by DragDropTeamBuilder)
/api/team-position-couplings     GET, POST
/api/team-position-couplings/[id] PATCH, DELETE
/api/bestellingen                GET, POST
/api/bestellingen/[id]           GET, PATCH, DELETE
/api/bestelling-types            GET, POST
/api/financial-sources           GET, POST
/api/financial-sources/[id]      GET, PATCH, DELETE
/api/financial-source-amounts    GET, POST, PATCH, DELETE
/api/financial-types             GET, POST, DELETE
/api/funding-allocations         GET, POST
/api/funding-allocations/[id]    PATCH, DELETE
/api/salarisschalen              GET, POST
/api/salarisschalen/[id]         PATCH, DELETE
/api/salarisschalen/lookup       GET (lookup by schaalCode + year with nearest-year fallback)
/api/company-persex              GET (list per year)
/api/company-persex/[id]         PATCH
/api/comments                    GET (by type+id), POST
/api/audit-events                GET (by entityType+entityId)
/api/notifications               GET (in-app notifications for current user)
/api/users                       GET, POST
/api/users/[id]                  GET, PATCH, DELETE
/api/users/me                    GET (current user profile)
/api/users/totp                  POST (start TOTP setup), PUT (confirm + get recovery codes), DELETE (disable TOTP)
/api/search                      GET (Meilisearch proxy)
/api/health                      GET (liveness check)
```

### 5.2 Request Handling Pattern

Route handlers use one of two wrappers from `lib/api.ts`:

**`withErrorHandling()`** — base wrapper for GET routes and bespoke handlers. Catches `AuthError` → 401, `ForbiddenError` → 403, `ApiError` → its status, and unhandled errors → 500.

**`withMutation(schema)`** — higher-level wrapper for POST/PATCH routes. Runs `withErrorHandling`, calls `requireAuth()`, parses and validates the request body with the provided Zod schema, and hands the parsed body + session to the inner handler. Eliminates the boilerplate auth + parse + 400 pattern from every mutation route.

```typescript
// GET route
export const GET = withErrorHandling(async (req) => {
  const session = await requireAuth();
  // ... fetch and return ok(data)
});

// POST route (mutation)
export const POST = withMutation(CreateSchema, async (data, session) => {
  const actor = actorFromSession(session);
  const result = await createEntity(data, actor);
  return created(result);
});
```

Mutation routes extract an `Actor` (`{ userId, organisationId, role }`) via `actorFromSession()` and pass it to the service layer. The Actor is the single contract between route handlers and services.

**Response helpers:** `ok(data)` → 200, `created(data)` → 201, `notFound()` → 404, `badRequest(msg)` → 400, `conflict(msg)` → 409.

### 5.3 Service Layer

Domain logic lives in `lib/services/`. Each service module owns one entity domain:

| File | Responsibilities |
|---|---|
| `lib/services/teams.ts` | `createTeam`, `updateTeam`, `archiveTeam`, `createTeamsBulk` |
| `lib/services/positions.ts` | `createPosition`, `updatePosition`, `archivePosition` |
| `lib/services/organisations.ts` | `updateOrganisation`, `archiveOrganisation` |
| `lib/services/funding-allocations.ts` | `createFundingAllocation`, `updateFundingAllocation`, `deleteFundingAllocation` |

Every service function takes an `Actor` (not a session object). Internally, services:
1. Fetch the current state from the DB
2. Assert org access via `assertOrgAccess()` if needed
3. Apply the mutation
4. Call `logAudit()` with before/after snapshots
5. Dispatch a search index sync via `dispatchSync()`

Routes are kept thin: parse → `actorFromSession()` → call service → return response helper.

### 5.4 Server-side Loaders

Shared data-fetching patterns used by multiple server pages live in `lib/loaders/`:

**`lib/loaders/paginate.ts`** — `paginate({ count, fetch, page, pageSize })` → `PageResult<T>`

Centralises the count → ceil → clamp → fetch pipeline used by all list pages. Prevents page-count logic from being duplicated across `/teams`, `/medewerkers`, `/posities`, `/financiering`, `/bestellingen`, etc.

**`lib/loaders/detail.ts`** — `fetchDetailSidebar(entityType, entityId)` → `{ comments, audit }`

Fetches the comments + audit log for any entity detail page in a single `Promise.all`. Supported entity types: `team`, `employee`, `position`, `financialSource`, `fundingAllocation`, `bestelling`, `teamMembership`, `positionAssignment`.

### 5.5 Validation

Zod schemas at the API boundary enforce:
- Required fields and types
- UUID format for ID fields
- Enum values matching TypeScript union types (`PositionStatus`, `UserRole`, etc.)
- Domain constraints (e.g. FundingAllocation `.refine(d => d.positionId || d.teamId)`)

The Zod schemas and TypeScript types in `lib/db/schema.ts` are the single source of truth.

### 5.6 Audit Logging

Every mutation calls `logAudit()` from `lib/audit.ts`:

```typescript
await logAudit({
  actorUserId: session.user?.id,
  entityType: "team",
  entityId: row.id,
  action: "update",
  before: before as Record<string, unknown>,
  after: after as Record<string, unknown>,
  reason: parsed.data.reason,
});
```

`logAudit` inserts a record into `audit_events` with serialized JSON snapshots. This table is append-only — no updates or deletes.

---

## 6. Authentication & Authorization

### 6.1 Design Constraints

The application is deployed on an **offline enterprise network** with no access to external services (no email relay, no OAuth providers, no internet). All authentication is self-contained.

### 6.2 NextAuth v5 Setup

NextAuth is used **only for session management** (reading sessions via `auth()`, signing out, storing sessions in the DB via `DrizzleAdapter`). It has no providers configured. The actual authentication flow is handled by server actions in `app/inloggen/actions.ts` that create sessions manually.

**Why this split:** NextAuth's `CredentialsProvider` does not cleanly support a two-step password + TOTP flow. Manual session creation (same `sessions` table the adapter uses) gives full control over the flow while keeping the session-reading infrastructure of NextAuth intact.

### 6.3 Credential Authentication Flow

```
1. User submits email + password  →  signInWithPassword() server action
2. authenticate() in lib/auth/authenticate.ts:
     a. Fetch user by email
     b. Check isEnabled and lockedUntil
     c. Verify password with crypto.scrypt
     d. If wrong: increment failedLoginAttempts; lock after 5 (15 min)
     e. If correct + TOTP disabled: create session → redirect to dashboard
     f. If correct + TOTP enabled: set signed pending cookie → redirect to ?stap=totp
3. User submits 6-digit TOTP code (or 8-char recovery code)  →  signInWithTotp() server action
4. Verify pending cookie (HMAC-SHA256, 5-min TTL) to confirm step 2 was completed
5. Verify code against decrypted TOTP secret; reject replays via lastTotpCounter
6. Create session → redirect to dashboard
```

**Security properties:**
- **Password hashing:** `crypto.scrypt` (N=32768, r=8, p=1, 64-byte key, 32-byte salt). No external library.
- **TOTP:** RFC 6238 HMAC-SHA1, implemented with `crypto.createHmac`. No external library.
- **TOTP secret at rest:** AES-256-GCM encrypted before DB storage. Key derived from `AUTH_SECRET` via HMAC-SHA256.
- **Replay prevention:** `lastTotpCounter` stored per user; codes at or before the last-used counter are rejected.
- **Brute-force protection:** 5 failed password attempts → 15-minute lockout (`lockedUntil` column).
- **Recovery codes:** 8 one-time codes issued on TOTP setup. Stored as scrypt hashes. Essential for offline deployments where email reset is unavailable.
- **Timing safety:** `timingSafeEqual` used for all HMAC signature comparisons.
- **Pending cookie:** httpOnly, sameSite=strict, scoped to `/inloggen`, 5-minute TTL.

### 6.4 User Management

Admins manage accounts at `/beheer/gebruikers`. Operations:
- Create account (name, email, initial password ≥12 chars, role, organisation)
- Enable / disable account (`isEnabled` flag — disabled accounts cannot log in)
- Change password, change role, change organisation assignment
- Disable a user's TOTP (e.g. when they lose their authenticator app)

Users set up their own TOTP at `/instellingen/mfa` after first login.

### 6.5 User Roles

| Role | Access |
|---|---|
| `admin` | Full access + user management (`/beheer/gebruikers`) |
| `manager` | Read/write within their organisation |
| `viewer` | Read-only access |

> **Note:** Role-based access control at the API route level is not yet enforced. All authenticated users can perform any operation. Role enforcement is the next security milestone.

### 6.6 Organisation Scoping

Users have an `organisationId` FK. Future versions will scope all API queries to the user's organisation. Currently, all authenticated users can see all organisations.

---

## 7. UX and Design System

### 7.1 Rijksoverheid Huisstijl

The application follows the Dutch government's Rijkshuisstijl (house style):

- **Colours**: Primary `#154273` (hemelblauw-700), Accent `#F9B000` (geel-500), Background `#FFFFFF`
- **Typography**: RO Sans font family, imported via `@rijkshuisstijl-community/font`
- **CSS variables**: All colours and spacing use `--rvo-*` and `--utrecht-*` design tokens
- **Components**: `@rijkshuisstijl-community/components-react` for Heading, Paragraph, Button, Alert, BreadcrumbNav, etc.
- **CSS classes**: `utrecht-button`, `utrecht-textbox`, `utrecht-table`, etc. for standard HTML elements

### 7.2 Accessibility

- Skip-to-content link (`#main-content`)
- ARIA labels on all navigation elements
- `aria-current="page"` on active nav link
- `role="alert"` on form error messages
- Dutch language (`lang="nl"` on `<html>`)
- Semantic HTML throughout

### 7.3 Navigation Structure

```
Header (persistent): Dashboard | Organisaties | Teams | Medewerkers | Financiering
Breadcrumbs (page-level): Home > Section > Entity name
```

### 7.4 Page Layout Conventions

- **List pages**: page header with title + primary action button; table with sortable columns; empty state message
- **Detail pages**: breadcrumb; entity header with name, status badge, edit button; stats bar; section tables; comments + audit log at bottom
- **Form pages**: breadcrumb; form title; labelled form fields; inline error messages; primary submit + secondary cancel

---

## 8. Data Patterns

### 8.1 Soft Delete

All major entities (`organisations`, `teams`, `employees`, `positions`, `financialSources`) have a `deletedAt` nullable timestamp column. Archiving sets this timestamp; restoring would clear it. Queries always filter `isNull(deletedAt)` to exclude archived records.

### 8.2 Temporal Tracking

Team memberships and position assignments both have `startDate` and `endDate` columns. The current state is derived by querying for records where `status = 'active'` and `endDate IS NULL`. Historical state at any date `D` can be derived by: `startDate <= D AND (endDate IS NULL OR endDate > D)`.

### 8.3 Funding Reallocation

When funding is reallocated, the original `FundingAllocation` record is marked `reallocated` (not deleted) and a new allocation is created. This means the original allocation — including which financial source it came from and what it was funding — is permanently preserved. Queries for the current allocation filter by `status = 'active'`.

### 8.4 Polymorphic Comments

Comments use a `commentableType` + `commentableId` discriminator rather than separate FK columns per entity type. Supported types: `team`, `employee`, `position`, `financialSource`, `fundingAllocation`, `bestelling`, `teamMembership`, `positionAssignment`. No DB-level FK constraint exists on `commentableId` (by design, to support multiple entity types).

---

## 9. Key Workflows

### 9.1 Position Lifecycle

```
1. Manager creates a Position (status: gepland, no employee)
2. Position moves through planning stages (gewenst → toegezegd) as it is approved
3. Budget is allocated to the position via FundingAllocation
4. Position is opened for hiring (status: open)
5. Employee is assigned via PositionAssignment (status: gevuld)
6. If employee leaves: PositionAssignment.endDate set, position reverts to open
7. If position is abolished: status: gesloten, FundingAllocation marked reallocated
```

The `gepland → gewenst → toegezegd` pre-open stages represent the position approval pipeline before it becomes active.

### 9.2 Financial Traceability

To answer "what happened to budget from source X?":
1. Load `FinancialSource` with its `amounts`
2. For each amount, load `FundingAllocation[]` (all statuses, not just active)
3. `active` allocations show current use; `reallocated` ones show history with reason
4. Each allocation links back to the original financial source amount

### 9.3 Team Composition Change

```
1. Employee joins team: TeamMembership created (startDate = today, status: active)
2. Employee moves to another team:
   - Old TeamMembership: endDate = today, status: ended
   - New TeamMembership: startDate = today, status: active
3. Full history visible on Employee detail page (membership history table)
```

---

## 10. Developer Guide

### 10.1 Environment Setup

```bash
# Clone and install
git clone <repo>
cd team-management
npm install

# Environment variables
cp .env.example .env
# Required: DATABASE_URL, AUTH_SECRET (min 32 random chars — used to sign sessions and
#   derive the TOTP encryption key; changing this invalidates all sessions and TOTP secrets)

# Database
npm run db:migrate       # apply all migrations
npm run db:seed          # optional: seed with test data

# Dev server
npm run dev              # http://localhost:3000 — "Dev: direct inloggen als admin" button available
npm run test             # run Vitest suite
npm run test:watch       # watch mode
```

### 10.2 Code Conventions

- **API routes**: use `withMutation(schema)` for POST/PATCH, `withErrorHandling()` for GET; extract `Actor` via `actorFromSession()` and pass it to the service
- **Page files**: Server Components, `redirect("/inloggen")` if unauthenticated, `notFound()` for 404
- **Forms**: Client Components, call API routes via `fetch`, show inline errors, `router.push()` on success
- **Types**: use `$inferSelect` / `$inferInsert` from schema; never define duplicate interfaces
- **Dates**: always `new Date(isoString)` when inserting; `formatDate()` from `lib/utils` when displaying
- **Currency**: always `formatCurrency()` from `lib/utils`; never inline `Intl.NumberFormat`
- **Names**: always `formatFullName()` from `lib/utils`
- **Audit**: call `logAudit()` after every state-changing API mutation

### 10.3 Adding a New Entity

1. Add table + relations to `lib/db/schema.ts`
2. Run `npm run db:generate` to produce the migration SQL, review it, then `npm run db:migrate`
3. Add a service module: `lib/services/<entity>.ts` with `create<Entity>`, `update<Entity>`, `archive<Entity>` functions taking an `Actor`
4. Add API routes: `app/api/<entity>/route.ts` + `app/api/<entity>/[id]/route.ts` (use `withMutation` for mutations)
5. Add list page: `app/<entity>/page.tsx` (use `paginate()` from `lib/loaders/paginate.ts`)
6. Add detail page: `app/<entity>/[id]/page.tsx` (use `fetchDetailSidebar()` from `lib/loaders/detail.ts`)
7. Add create form: `app/<entity>/nieuw/page.tsx` (server wrapper) + `Nieuw<Entity>Form.tsx` (client form)
8. Add edit form: `app/<entity>/[id]/bewerken/page.tsx` + `EditForm.tsx`
9. Add Vitest route tests: `__tests__/routes/<entity>.test.ts`
10. Add Vitest service tests: `__tests__/unit/services/<entity>.test.ts`

### 10.4 Testing

Tests are in `__tests__/`. The Drizzle `db` is mocked with a Proxy that handles all chainable query patterns. Routes are tested by importing the handler functions directly.

```
__tests__/
├── helpers/request.ts            — creates mock Request objects
├── setup.ts                      — global afterEach clearAllMocks
├── unit/
│   ├── api.test.ts               — lib/api.ts helpers
│   ├── audit.test.ts             — lib/audit.ts
│   ├── dashboard.test.ts         — detectPositionConflicts + collectUpcomingEvents
│   ├── financial-conflicts.test.ts — evaluateSourceAmountConflicts + detectBestellingConflicts
│   ├── bestellingen.test.ts      — bestelling conflict / allocation pure functions
│   ├── company-persex.test.ts    — CompanyPersexBudget service logic
│   ├── drizzle-alias-collision.test.ts — regression: Drizzle alias shadowing
│   ├── opf-types.test.ts         — OPF classification helpers
│   ├── salarisschalen.test.ts    — salary grade lookup with nearest-year fallback
│   ├── seed.test.ts              — DB seed script
│   ├── utils.test.ts             — lib/utils helpers
│   ├── auth/
│   │   ├── password.test.ts      — hashPassword / verifyPassword
│   │   ├── totp.test.ts          — TOTP generate / verify / encrypt / decrypt
│   │   ├── totp-key.test.ts      — TOTP key derivation
│   │   ├── authenticate.test.ts  — full auth flow with mocked DB
│   │   ├── rate-limit.test.ts    — brute-force lockout logic
│   │   ├── admin-password-reset.test.ts
│   │   ├── change-password-action.test.ts
│   │   ├── sign-in-force-change.test.ts — forced password change on first login
│   │   └── user-creation-flag.test.ts
│   └── services/
│       ├── teams.test.ts         — createTeam, updateTeam, archiveTeam (service unit tests)
│       └── funding-allocations.test.ts
└── routes/
    ├── organisations.test.ts
    ├── teams.test.ts
    ├── teams.bulk.test.ts        — POST /api/teams/bulk
    ├── employees.test.ts
    ├── positions.test.ts
    ├── comments.test.ts
    ├── funding-allocations.test.ts
    ├── bestellingen.test.ts
    ├── budget-grid.test.ts
    ├── notifications.test.ts
    ├── salarisschalen.test.ts
    ├── team-position-couplings.test.ts
    └── users-me.test.ts
```

**DB mock pattern** (`vi.hoisted`):

The mock uses a Proxy that queues return values and resolves any chain of method calls (`.insert().values().returning()`, `.query.positions.findMany()`, etc.) to the next queued value. Tests call `dbMock.set(val1, val2, ...)` before exercising the route — each awaited DB call in the route consumes one value in sequence.

```typescript
dbMock.set([POSITION])              // single DB call → returns [POSITION]
dbMock.set([EXISTING], [UPDATED])   // two DB calls: first returns [EXISTING], second [UPDATED]
```

---

## 11. Roadmap

### v1.1 — Workforce Planning & UX ✅ (complete)
- `requiredBefore` date field on positions
- Dashboard conflict detection (late starts, unfunded positions)
- Dashboard upcoming events (30–90 day horizon)
- Sortable table headers on all list pages (URL-based, no JS)
- Filters on all list pages (text search + entity dropdown)
- Drag-and-drop team builder (`/indelen` page)
- Printable team overview page (`/teams/[id]/overzicht`)
- `<title>` tags on every page via `metadata` / `generateMetadata`
- Unit tests for dashboard business logic

### v1.2 — Offline Auth & User Management ✅ (complete)
- Replaced Resend magic-link auth with offline username/password credentials
- TOTP MFA (RFC 6238) with scrypt-hashed one-time recovery codes
- AES-256-GCM encrypted TOTP secrets at rest; TOTP replay prevention
- Brute-force lockout (5 attempts → 15-minute lockout)
- Admin user management UI (`/beheer/gebruikers`): create, enable/disable, reset MFA
- Self-service TOTP setup (`/instellingen/mfa`)
- Two-step login flow with signed short-lived pending cookie

### v1.3 — Architecture & New Entities (in progress)
- Actor type for service contracts (`lib/api.ts` + `lib/services/`)
- Service layer extracted from API routes (`lib/services/teams`, `positions`, `organisations`, `funding-allocations`)
- Shared loaders (`lib/loaders/paginate`, `lib/loaders/detail`)
- Bestellingen (ATB procurement orders) with conflict detection and allocation tracking
- Salarisschalen (salary grade reference table with nearest-year lookup)
- CompanyPersexBudget (government-wide annual personnel budget)
- TeamPositionCoupling (temporal team ↔ position junction replacing direct FK)
- In-app notification centre (`/api/notifications`)

### v1.4 — Access Control
- Enforce role-based permissions at API route level
- Scope queries to `user.organisationId`
- Viewer role: disable all mutation buttons in UI

### v1.5 — Advanced Workforce Planning
- Dashboard: planned vs actual positions chart
- Timeline view per employee (position history as visual timeline)
- Position gap analysis (open positions without funding)

### v1.6 — Reporting
- Export team composition to CSV/PDF
- Budget allocation report per organisation/year
- Position fill rate trend chart

---

## 12. Architecture Decision Records

### ADR-001: Drizzle ORM over Prisma
**Decision:** Use Drizzle ORM.  
**Rationale:** Better TypeScript inference on relational queries, lightweight, no code generation step. Schema-as-code aligns with Next.js conventions. Drizzle's `$type<>()` narrowing for text columns with union types is a strong fit for this domain.

### ADR-002: REST API routes over Server Actions for mutations
**Decision:** Mutations go through `app/api/` REST routes.  
**Rationale:** Enables testing without a browser (Vitest imports handlers directly), supports future external integrations, and provides a clear contract between frontend and backend. Server Actions are used only for auth (sign-in/sign-out).

### ADR-003: Soft delete over hard delete
**Decision:** Archive entities with `deletedAt` timestamp.  
**Rationale:** Financial and HR data must be retained for audit purposes. A position that was filled and funded must remain in history even when "deleted" by an admin.

### ADR-004: Append-only audit log
**Decision:** `audit_events` table is never updated or deleted.  
**Rationale:** The audit trail must be tamper-proof. Compliance with government record-keeping requirements.

### ADR-005: Polymorphic comments
**Decision:** Use `commentable_type` + `commentable_id` discriminator.  
**Rationale:** Comments are a cross-cutting concern. Adding separate FK columns per entity would require schema changes every time a new commentable entity is added.

### ADR-006: Server-wrapper + client-form split for "nieuw" pages
**Decision:** All create pages are split into a server `page.tsx` (fetches prerequisite data, exports `metadata`) and a client `*Form.tsx` (handles form state and API calls).  
**Rationale:** Next.js does not allow `"use client"` and `export const metadata` in the same file. The split also eliminates the `useEffect`-based fetch waterfall that would otherwise occur when the client fetches org/employee dropdowns after mount.

### ADR-007: URL-based sorting and filtering (no client state)
**Decision:** All list-page sorting and filtering is expressed entirely in the URL (`?sort=&order=&q=&orgId=&page=`). The `SortHeader` component renders `<a>` links; filter forms use `<form method="get">`.  
**Rationale:** Server-rendered sorting requires no JavaScript. Deep-linked URLs let users bookmark or share filtered views. It avoids the need for a global client-side state manager for a purely read-oriented feature.

### ADR-008: HTML5 Drag-and-Drop API (no library)
**Decision:** `DragDropTeamBuilder` uses the native `draggable` attribute and `onDragStart`/`onDragOver`/`onDrop` events rather than an external DnD library.  
**Rationale:** The interaction is simple (single-item card moves between columns) and doesn't require complex nesting, reordering within lists, or touch support. Adding a library (react-dnd, dnd-kit) would add bundle weight and abstraction overhead disproportionate to the use case.

### ADR-009: Dashboard analytics as pure functions in `lib/dashboard.ts`
**Decision:** Conflict detection and upcoming-event aggregation are plain TypeScript functions that take typed arrays and return typed arrays, with no DB access.  
**Rationale:** The dashboard page already fetches all required data from the DB. Keeping the aggregation logic as pure functions makes it trivially testable in Vitest without needing DB mocks, and keeps the page component thin.

### ADR-010: Zero-dependency offline credentials auth
**Decision:** All cryptographic primitives (password hashing, TOTP, AES-256-GCM secret encryption, HMAC signing) are implemented using only Node.js built-in `crypto`. No new npm packages added.  
**Rationale:** The application runs on an offline enterprise network with no access to external package registries post-deployment. Minimising the dependency surface also reduces the supply-chain attack risk and eliminates the need for runtime native compilation. `crypto.scrypt` (OWASP-recommended, memory-hard) and HMAC-SHA1 TOTP (RFC 6238) are well-specified and do not require a library.

### ADR-011: Manual session creation; NextAuth for session reading only
**Decision:** Login server actions create sessions manually (insert into `sessions` table + set `authjs.session-token` cookie). NextAuth is configured with zero providers; it only reads sessions via `auth()`.  
**Rationale:** NextAuth's `CredentialsProvider.authorize()` is a single synchronous step. A two-step password + TOTP flow requires an intermediate "pending" state (signed cookie) between steps — something that doesn't fit the NextAuth credential provider model cleanly. Manual session creation reuses the exact same schema and cookie that NextAuth reads, so `auth()`, `signOut()`, and all session callbacks continue to work unchanged.

### ADR-012: Actor type as the service layer contract
**Decision:** Services in `lib/services/` accept an `Actor` (`{ userId, organisationId, role }`) rather than a raw `Session` or a `(session, userId)` pair.  
**Rationale:** Session objects are shaped by NextAuth and carry authentication details irrelevant to domain logic. Actor is the minimal, domain-meaningful identity: who acted, from which org, with what role. Extracting Actor at the route boundary (`actorFromSession()`) keeps session handling in the API layer and makes service functions independently testable with a plain object — no NextAuth mock needed.

### ADR-013: Shared loaders in `lib/loaders/` for server-side data fetching
**Decision:** Repeated data-fetching patterns used across multiple server pages are extracted into `lib/loaders/` (`paginate`, `fetchDetailSidebar`) rather than inlined per page.  
**Rationale:** Before extraction, the count → ceil → clamp → fetch pagination pipeline was copy-pasted across every list page with subtle divergence in edge-case handling (off-by-one on total pages, different defaults for pageSize). Similarly, every detail page ran two sequential DB queries for comments and audit events. Centralising these patterns ensures consistent behaviour and gives a single place to change the logic. Unlike services, loaders are pure data-fetching with no mutation or audit side effects.
