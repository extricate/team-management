# Teambeheer — Architectural Design Document

**Version:** 1.0  
**Last updated:** April 2026  
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
| Framework | Next.js 14 (App Router) | Server Components by default |
| Language | TypeScript 5 | Strict mode |
| Database | PostgreSQL | Via Supabase or direct connection |
| ORM | Drizzle ORM | Type-safe, schema-first |
| Auth | NextAuth.js v5 (beta) | Resend magic links + GitHub OAuth |
| UI Library | @rijkshuisstijl-community/components-react v15 | NL Design System / Rijksoverheid |
| Validation | Zod | Schema validation at API boundary |
| Testing | Vitest | Unit + route integration tests |
| Deployment | Vercel (assumed) | Edge-compatible |

---

## 3. Domain Model

### 3.1 Entity Relationship Overview

```
Organisation
 ├──< Team
 │    ├──< Position ──< PositionAssignment >── Employee
 │    ├──< TeamMembership >── Employee
 │    └──< FundingAllocation (team-level)
 ├──< Employee
 └──< FinancialSource
      └──< FinancialSourceAmount
           └──< FundingAllocation (position-level or team-level)
```

### 3.2 Entity Descriptions

**Organisation**  
Top-level container. Type is either OS1 or OS2 (organisation structure classifications). All teams, employees, and financial sources belong to one organisation.

**Team**  
A group within an organisation. Has many positions and many employees (via TeamMembership). Teams can receive team-level funding allocations (for overhead, training, etc.).

**Employee**  
A person employed in the organisation. Belongs to one organisation but can be a member of multiple teams over time (via TeamMembership). Holds positions over time (via PositionAssignment).

**Position**  
A role slot within a team. Statuses: `planned → open → filled → closed`. A position can be filled by multiple employees sequentially (never concurrently). The `positionCode` is an optional external reference (e.g. from HR systems).

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

**FundingAllocation**  
Links a FinancialSourceAmount to either a Position or a Team. Supports partial allocations via `amount` and `percentage`. Status tracks `active → reallocated | expired`. The original allocation is never deleted — it is marked `reallocated` and a new allocation is created. This is the cornerstone of financial traceability.

**Comment**  
Polymorphic comment on any entity (team, employee, position, financialSource, fundingAllocation). Stored with `commentableType` + `commentableId` discriminator.

**AuditEvent**  
Append-only log of every mutation. Stores `beforeJson` and `afterJson` snapshots, the acting user, the action type, and an optional reason. Never updated or deleted.

### 3.3 Key Constraints

- A Position belongs to exactly one Team (never moved).
- A FundingAllocation must reference either a Position or a Team (validated via Zod `.refine()`).
- Historical integrity is enforced by retaining all records with `endDate`; state at any point in time is derivable.
- Soft delete: all major entities have a `deletedAt` column; deletion sets this timestamp rather than removing the row.

### 3.4 Status Lifecycles

```
Position:   planned → open → filled → closed
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
- Client components (`"use client"`) are used only where interactivity is required (forms with validation state, comment sections, navigation active state).

### 4.2 Component Hierarchy

```
app/layout.tsx (Server)
└── SiteHeader (Server) — wraps SiteHeaderNav (Client, uses usePathname)
└── <page> (Server) — queries DB, renders data
    └── CommentSection (Client) — manages local comment state
    └── EditForm (Client) — manages form state, POSTs to API routes
└── SiteFooter (Server)
```

### 4.3 Server vs Client Boundary

| Component | Type | Reason |
|---|---|---|
| `SiteHeader` | Server | Defines server action for sign-out |
| `SiteHeaderNav` | Client | Uses `usePathname` for active state |
| Page components (`page.tsx`) | Server | Direct DB queries |
| `CommentSection` | Client | Optimistic updates, local state |
| `AuditLog` | Server | Read-only display |
| `StatusBadge` | Server | Pure presentational |
| Create/Edit forms | Client | Form state, validation, API calls |

### 4.4 Form Pattern

Create/edit forms are client components that:
1. Optionally pre-fetch prerequisite lists (org options for team form, etc.)
2. Manage local form state and validation errors
3. `POST`/`PATCH` to the REST API routes
4. Redirect with `router.push()` on success

Edit page pattern (two files):
```
app/teams/[id]/bewerken/
├── page.tsx     — Server Component: fetches team, renders EditForm
└── EditForm.tsx — Client Component: form pre-filled with team data
```

Create page pattern (single file):
```
app/teams/nieuw/
└── page.tsx     — Client Component: fetches org list, handles form
```

### 4.5 Data Access Pattern

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
- Client components (forms, comment section)
- External integrations (future)
- Testing (Vitest mocks the API layer)

---

## 5. Backend Architecture

### 5.1 API Route Structure

```
/api/organisations         GET (list), POST (create)
/api/organisations/[id]    GET, PATCH, DELETE
/api/teams                 GET, POST
/api/teams/[id]            GET, PATCH, DELETE
/api/employees             GET, POST
/api/employees/[id]        GET, PATCH, DELETE
/api/positions             GET, POST
/api/positions/[id]        GET, PATCH, DELETE
/api/position-assignments  POST
/api/team-memberships      POST
/api/financial-sources     GET, POST
/api/financial-sources/[id] GET, PATCH, DELETE
/api/funding-allocations   GET, POST
/api/comments              GET (by type+id), POST
/api/audit-events          GET (by entityType+entityId)
/api/users                 GET, POST
/api/users/[id]            GET, PATCH, DELETE
```

### 5.2 Request Handling Pattern

All route handlers use `withErrorHandling()` from `lib/api.ts`:

```typescript
export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();      // 401 if not authenticated
  const body = await req.json();
  const parsed = Schema.safeParse(body);    // 400 if invalid
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const [row] = await db.insert(table).values(parsed.data).returning();
  await logAudit({ ... });
  return created(row);                      // 201
});
```

`withErrorHandling<TArgs>` is generic so TypeScript infers handler argument types without casting. `AuthError` is automatically caught and mapped to 401.

### 5.3 Validation

Zod schemas at the API boundary enforce:
- Required fields and types
- UUID format for ID fields
- Enum values matching TypeScript union types (`PositionStatus`, `UserRole`, etc.)
- Domain constraints (e.g. FundingAllocation `.refine(d => d.positionId || d.teamId)`)

The Zod schemas and TypeScript types in `lib/db/schema.ts` are the single source of truth.

### 5.4 Audit Logging

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

### 6.1 NextAuth v5 Setup

Authentication providers:
- **Resend** — magic link email (primary, production-ready)
- **GitHub** — OAuth (secondary, developer convenience)

Sessions are stored in the database via `DrizzleAdapter`.

### 6.2 User Roles

| Role | Access |
|---|---|
| `admin` | Full access: create, read, update, archive all entities |
| `manager` | Read/write within their organisation |
| `viewer` | Read-only access |

> **Note:** Role-based access control at the API route level is not yet enforced (as of v1.0). All authenticated users can perform any operation. Role enforcement is the next security milestone.

### 6.3 Organisation Scoping

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

Comments use a `commentableType` + `commentableId` discriminator rather than separate FK columns per entity type. Supported types: `team`, `employee`, `position`, `financialSource`, `fundingAllocation`. No DB-level FK constraint exists on `commentableId` (by design, to support multiple entity types).

---

## 9. Key Workflows

### 9.1 Position Lifecycle

```
1. Manager creates a Position (status: planned, no employee)
2. Budget is allocated to the position via FundingAllocation
3. Position is opened (status: open)
4. Employee is assigned via PositionAssignment (status: filled)
5. If employee leaves: PositionAssignment.endDate set, status: open
6. If position is abolished: status: closed, FundingAllocation marked reallocated
```

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
cp .env.example .env.local
# Set DATABASE_URL, NEXTAUTH_SECRET, RESEND_API_KEY, GITHUB_ID, GITHUB_SECRET

# Database
npx drizzle-kit push    # apply schema to DB
npm run db:seed         # optional: seed with test data

# Dev server
npm run dev             # http://localhost:3000
npm run test            # run Vitest suite
npm run test:watch      # watch mode
```

### 10.2 Code Conventions

- **API routes**: use `withErrorHandling()` wrapper, `requireAuth()`, Zod schema at the top
- **Page files**: Server Components, `redirect("/inloggen")` if unauthenticated, `notFound()` for 404
- **Forms**: Client Components, call API routes via `fetch`, show inline errors, `router.push()` on success
- **Types**: use `$inferSelect` / `$inferInsert` from schema; never define duplicate interfaces
- **Dates**: always `new Date(isoString)` when inserting; `formatDate()` from `lib/utils` when displaying
- **Currency**: always `formatCurrency()` from `lib/utils`; never inline `Intl.NumberFormat`
- **Names**: always `formatFullName()` from `lib/utils`
- **Audit**: call `logAudit()` after every state-changing API mutation

### 10.3 Adding a New Entity

1. Add table + relations to `lib/db/schema.ts`
2. Run `npx drizzle-kit generate` + `npx drizzle-kit push`
3. Add API routes: `app/api/<entity>/route.ts` + `app/api/<entity>/[id]/route.ts`
4. Add list page: `app/<entity>/page.tsx`
5. Add detail page: `app/<entity>/[id]/page.tsx`
6. Add create form: `app/<entity>/nieuw/page.tsx`
7. Add edit form: `app/<entity>/[id]/bewerken/page.tsx` + `EditForm.tsx`
8. Add Vitest route tests: `__tests__/routes/<entity>.test.ts`

### 10.4 Testing

Tests are in `__tests__/`. The Drizzle `db` is mocked with a Proxy that handles all chainable query patterns. Routes are tested by importing the handler functions directly.

```
__tests__/
├── helpers/request.ts       — creates mock Request objects
├── setup.ts                 — global afterEach clearAllMocks
├── unit/
│   ├── api.test.ts          — lib/api.ts helpers (17 tests)
│   └── audit.test.ts        — lib/audit.ts (3 tests)
└── routes/
    ├── organisations.test.ts
    ├── teams.test.ts
    ├── employees.test.ts
    ├── positions.test.ts
    ├── comments.test.ts
    └── funding-allocations.test.ts
```

---

## 11. Roadmap

### v1.1 — Access Control
- Enforce role-based permissions at API route level
- Scope queries to `user.organisationId`
- Viewer role: disable all mutation buttons in UI

### v1.2 — Advanced Workforce Planning
- Dashboard: planned vs actual positions chart
- Timeline view per employee (position history as visual timeline)
- Position gap analysis (open positions without funding)

### v1.3 — Search & Filtering
- Organisation/team filter on all list pages
- Date range filter for historical views
- Full-text search on employee names and team names

### v1.4 — Notifications
- Email notifications for key events (position opened, budget allocated)
- In-app notification centre

### v1.5 — Reporting
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
