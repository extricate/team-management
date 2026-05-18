import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  primaryKey,
  numeric,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// ── Domain type aliases ────────────────────────────────────────────────────────
// Defined before the tables so $type<> narrowing below can reference them.
export type UserRole = "admin" | "manager" | "viewer";
export type OrganisationType = "OS1" | "OS2";
export type PositionStatus = "gepland" | "gewenst" | "toegezegd" | "open" | "gevuld" | "gesloten";
export type MembershipStatus = "active" | "ended";
export type FunctieMembershipStatus = "active" | "ended";
export type AllocationStatus = "active" | "reallocated" | "expired";
export type AmountStatus = "concept" | "released";
export type FinancialTypeCategory = "PERSEX" | "MATEX" | "Investeringen" | "geen";
export type CommentableType =
  | "team"
  | "employee"
  | "position"
  | "financialSource"
  | "fundingAllocation"
  | "bestelling";

// ── Users ──────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  role: text("role").$type<UserRole>().notNull().default("viewer"),
  organisationId: uuid("organisation_id").references(() => organisations.id),
  defaultOrganisationId: uuid("default_organisation_id").references(() => organisations.id),
  // Credentials auth
  passwordHash: text("password_hash"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { mode: "date" }),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  // TOTP — secret stored AES-256-GCM encrypted
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  lastTotpCounter: integer("last_totp_counter"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── TOTP recovery codes ────────────────────────────────────────────────────────
export const totpRecoveryCodes = pgTable("totp_recovery_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  usedAt: timestamp("used_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Auth.js adapter tables ─────────────────────────────────────────────────────
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => ({ pk: primaryKey({ columns: [t.provider, t.providerAccountId] }) })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.identifier, t.token] }) })
);

// ── Organisations ──────────────────────────────────────────────────────────────
export const organisations = pgTable("organisations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").$type<OrganisationType>().notNull(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Teams ──────────────────────────────────────────────────────────────────────
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
  name: text("name").notNull(),
  description: text("description"),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Employees ──────────────────────────────────────────────────────────────────
export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
  personeelsnummer: text("personeelsnummer").unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  prefixName: text("prefix_name"),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Bestelling Types ───────────────────────────────────────────────────────────
export const bestellingTypes = pgTable("bestelling_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  naam: text("naam").notNull(),
  omschrijving: text("omschrijving"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Bestellingen ───────────────────────────────────────────────────────────────
export const bestellingen = pgTable("bestellingen", {
  id: uuid("id").primaryKey().defaultRandom(),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
  typeId: uuid("type_id").notNull().references(() => bestellingTypes.id),
  atbNummer: text("atb_nummer").notNull(),
  omschrijving: text("omschrijving").notNull(),
  geraamdBedrag: numeric("geraamd_bedrag", { precision: 15, scale: 2 }),
  werkelijkBedrag: numeric("werkelijk_bedrag", { precision: 15, scale: 2 }),
  aanvraagDatum: timestamp("aanvraag_datum", { mode: "date" }),
  notities: text("notities"),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Positions ──────────────────────────────────────────────────────────────────
export const positions = pgTable("positions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
  bestellingId: uuid("bestelling_id").references(() => bestellingen.id),
  functieId: uuid("functie_id").references(() => functies.id),
  // type kept nullable as migration fallback for rows predating functies; see roltitel
  type: text("type"),
  // roltitel is free text used when functieId points to the "Niet beschikbaar" sentinel
  roltitel: text("roltitel"),
  opfType: text("opf_type"),
  positionCode: text("position_code"),
  schaal: text("schaal"),
  annualCost: numeric("annual_cost", { precision: 15, scale: 2 }),
  status: text("status").$type<PositionStatus>().notNull().default("gepland"),
  expectedStart: timestamp("expected_start", { mode: "date" }),
  expectedEnd: timestamp("expected_end", { mode: "date" }),
  requiredBefore: timestamp("required_before", { mode: "date" }),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Team ↔ Position couplings (temporal, 1:1 per position) ────────────────────
export const teamPositionCouplings = pgTable("team_position_couplings", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id),
  positionId: uuid("position_id").notNull().references(() => positions.id),
  startDate: timestamp("start_date", { mode: "date" }).notNull(),
  endDate: timestamp("end_date", { mode: "date" }), // null = currently active
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Team Memberships (employee ↔ team, temporal) ───────────────────────────────
export const teamMemberships = pgTable("team_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id),
  startDate: timestamp("start_date", { mode: "date" }).notNull(),
  endDate: timestamp("end_date", { mode: "date" }),
  status: text("status").$type<MembershipStatus>().notNull().default("active"),
  reason: text("reason"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Position Assignments (employee ↔ position, temporal) ──────────────────────
export const positionAssignments = pgTable("position_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  positionId: uuid("position_id").notNull().references(() => positions.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id),
  startDate: timestamp("start_date", { mode: "date" }).notNull(),
  endDate: timestamp("end_date", { mode: "date" }),
  status: text("status").$type<MembershipStatus>().notNull().default("active"),
  reason: text("reason"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Functies (ministry-wide job position catalog) ──────────────────────────────
export const functies = pgTable("functies", {
  id: uuid("id").primaryKey().defaultRandom(),
  titel: text("titel").notNull(),
  schaalCode: text("schaal_code"),
  isActive: boolean("is_active").notNull().default(true),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [uniqueIndex("functies_titel_idx").on(t.titel)]);

// ── Medewerker ↔ Functie (temporal, M:N with primary flag) ────────────────────
export const medewerkerFuncties = pgTable("medewerker_functies", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  functieId: uuid("functie_id").notNull().references(() => functies.id),
  isPrimary: boolean("is_primary").notNull().default(false),
  startDate: timestamp("start_date", { mode: "date" }).notNull(),
  endDate: timestamp("end_date", { mode: "date" }),
  status: text("status").$type<FunctieMembershipStatus>().notNull().default("active"),
  reason: text("reason"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [uniqueIndex("medewerker_functies_emp_functie_idx").on(t.employeeId, t.functieId)]);

// ── Salarisschalen (default costs per grade per year) ─────────────────────────
export const salarisschalen = pgTable("salarisschalen", {
  id: uuid("id").primaryKey().defaultRandom(),
  schaalCode: text("schaal_code").notNull(),
  year: integer("year").notNull(),
  primaryCost: numeric("primary_cost", { precision: 15, scale: 2 }).notNull(),
  secondaryEffects: numeric("secondary_effects", { precision: 15, scale: 2 }).notNull().default("0"),
  tertiaryEffects: numeric("tertiary_effects", { precision: 15, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [uniqueIndex("salarisschalen_schaal_year_idx").on(t.schaalCode, t.year)]);

// ── Company Persex (singleton government-wide personnel budget) ───────────────
export const companyPersexBudgets = pgTable("company_persex_budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  year: integer("year").notNull().unique(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").$type<AmountStatus>().notNull().default("concept"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Financial Sources ──────────────────────────────────────────────────────────
export const financialSources = pgTable("financial_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
  projectId: text("project_id").notNull(),
  name: text("name").notNull(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Financial Types (PERSEX, MATEX, Investeringen per year) ───────────────────
export const financialTypes = pgTable("financial_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  financialSourceId: uuid("financial_source_id").notNull().references(() => financialSources.id, { onDelete: "cascade" }),
  type: text("type").$type<FinancialTypeCategory>().notNull(),
  year: integer("year").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Financial Source Amounts ───────────────────────────────────────────────────
export const financialSourceAmounts = pgTable("financial_source_amounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  financialSourceId: uuid("financial_source_id").notNull().references(() => financialSources.id, { onDelete: "cascade" }),
  financialTypeId: uuid("financial_type_id").references(() => financialTypes.id),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").$type<AmountStatus>().notNull().default("concept"),
  effectiveDate: timestamp("effective_date", { mode: "date" }),
  releaseDate: timestamp("release_date", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Funding Allocations (source amount or company persex → position, team, or bestelling) ──
export const fundingAllocations = pgTable("funding_allocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  financialSourceAmountId: uuid("financial_source_amount_id").references(() => financialSourceAmounts.id),
  companyPersexBudgetId: uuid("company_persex_budget_id").references(() => companyPersexBudgets.id),
  positionId: uuid("position_id").references(() => positions.id),
  teamId: uuid("team_id").references(() => teams.id),
  bestellingId: uuid("bestelling_id").references(() => bestellingen.id),
  amount: numeric("amount", { precision: 15, scale: 2 }),
  percentage: numeric("percentage", { precision: 5, scale: 2 }),
  startDate: timestamp("start_date", { mode: "date" }),
  endDate: timestamp("end_date", { mode: "date" }),
  status: text("status").$type<AllocationStatus>().notNull().default("active"),
  reason: text("reason"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Comments (polymorphic) ─────────────────────────────────────────────────────
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  body: text("body").notNull(),
  commentableType: text("commentable_type").$type<CommentableType>().notNull(),
  commentableId: uuid("commentable_id").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Audit Events ───────────────────────────────────────────────────────────────
export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  beforeJson: jsonb("before_json"),
  afterJson: jsonb("after_json"),
  reason: text("reason"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Login rate limits ──────────────────────────────────────────────────────────
// One row per IP address; window resets after RATE_LIMIT_WINDOW_MS (15 min).
export const loginRateLimits = pgTable("login_rate_limits", {
  key: text("key").primaryKey(),
  attempts: integer("attempts").notNull().default(1),
  windowStart: timestamp("window_start", { mode: "date" }).notNull().defaultNow(),
});

// ── Drizzle Relations ──────────────────────────────────────────────────────────
export const functiesRelations = relations(functies, ({ many }) => ({
  medewerkerFuncties: many(medewerkerFuncties),
  positions: many(positions),
}));

export const medewerkerFunctiesRelations = relations(medewerkerFuncties, ({ one }) => ({
  employee: one(employees, { fields: [medewerkerFuncties.employeeId], references: [employees.id] }),
  functie: one(functies, { fields: [medewerkerFuncties.functieId], references: [functies.id] }),
  createdByUser: one(users, { fields: [medewerkerFuncties.createdBy], references: [users.id] }),
}));

export const organisationsRelations = relations(organisations, ({ many }) => ({
  teams: many(teams),
  employees: many(employees),
  financialSources: many(financialSources),
  users: many(users),
  bestellingen: many(bestellingen),
  positions: many(positions),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  organisation: one(organisations, { fields: [teams.organisationId], references: [organisations.id] }),
  positionCouplings: many(teamPositionCouplings),
  memberships: many(teamMemberships),
  fundingAllocations: many(fundingAllocations),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  organisation: one(organisations, { fields: [employees.organisationId], references: [organisations.id] }),
  memberships: many(teamMemberships),
  positionAssignments: many(positionAssignments),
  medewerkerFuncties: many(medewerkerFuncties),
}));

export const positionsRelations = relations(positions, ({ one, many }) => ({
  organisation: one(organisations, { fields: [positions.organisationId], references: [organisations.id] }),
  bestelling: one(bestellingen, { fields: [positions.bestellingId], references: [bestellingen.id] }),
  functie: one(functies, { fields: [positions.functieId], references: [functies.id] }),
  assignments: many(positionAssignments),
  fundingAllocations: many(fundingAllocations),
  teamCouplings: many(teamPositionCouplings),
}));

export const teamPositionCouplingsRelations = relations(teamPositionCouplings, ({ one }) => ({
  team: one(teams, { fields: [teamPositionCouplings.teamId], references: [teams.id] }),
  position: one(positions, { fields: [teamPositionCouplings.positionId], references: [positions.id] }),
  createdByUser: one(users, { fields: [teamPositionCouplings.createdBy], references: [users.id] }),
}));

export const teamMembershipsRelations = relations(teamMemberships, ({ one }) => ({
  team: one(teams, { fields: [teamMemberships.teamId], references: [teams.id] }),
  employee: one(employees, { fields: [teamMemberships.employeeId], references: [employees.id] }),
  createdByUser: one(users, { fields: [teamMemberships.createdBy], references: [users.id] }),
}));

export const positionAssignmentsRelations = relations(positionAssignments, ({ one }) => ({
  position: one(positions, { fields: [positionAssignments.positionId], references: [positions.id] }),
  employee: one(employees, { fields: [positionAssignments.employeeId], references: [employees.id] }),
  createdByUser: one(users, { fields: [positionAssignments.createdBy], references: [users.id] }),
}));

export const financialSourcesRelations = relations(financialSources, ({ one, many }) => ({
  organisation: one(organisations, { fields: [financialSources.organisationId], references: [organisations.id] }),
  types: many(financialTypes),
  amounts: many(financialSourceAmounts),
}));

export const financialTypesRelations = relations(financialTypes, ({ one }) => ({
  financialSource: one(financialSources, { fields: [financialTypes.financialSourceId], references: [financialSources.id] }),
}));

export const financialSourceAmountsRelations = relations(financialSourceAmounts, ({ one, many }) => ({
  financialSource: one(financialSources, { fields: [financialSourceAmounts.financialSourceId], references: [financialSources.id] }),
  type: one(financialTypes, { fields: [financialSourceAmounts.financialTypeId], references: [financialTypes.id] }),
  allocations: many(fundingAllocations),
}));

export const companyPersexBudgetsRelations = relations(companyPersexBudgets, ({ many }) => ({
  allocations: many(fundingAllocations),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  createdByUser: one(users, { fields: [comments.createdBy], references: [users.id] }),
}));

export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  actorUser: one(users, { fields: [auditEvents.actorUserId], references: [users.id] }),
}));

export const fundingAllocationsRelations = relations(fundingAllocations, ({ one }) => ({
  financialSourceAmount: one(financialSourceAmounts, { fields: [fundingAllocations.financialSourceAmountId], references: [financialSourceAmounts.id] }),
  companyPersexBudget: one(companyPersexBudgets, { fields: [fundingAllocations.companyPersexBudgetId], references: [companyPersexBudgets.id] }),
  position: one(positions, { fields: [fundingAllocations.positionId], references: [positions.id] }),
  team: one(teams, { fields: [fundingAllocations.teamId], references: [teams.id] }),
  bestelling: one(bestellingen, { fields: [fundingAllocations.bestellingId], references: [bestellingen.id] }),
  createdByUser: one(users, { fields: [fundingAllocations.createdBy], references: [users.id] }),
}));

export const bestellingTypesRelations = relations(bestellingTypes, ({ many }) => ({
  bestellingen: many(bestellingen),
}));

export const bestellingenRelations = relations(bestellingen, ({ one, many }) => ({
  organisation: one(organisations, { fields: [bestellingen.organisationId], references: [organisations.id] }),
  type: one(bestellingTypes, { fields: [bestellingen.typeId], references: [bestellingTypes.id] }),
  fundingAllocations: many(fundingAllocations),
  positions: many(positions),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organisation: one(organisations, { fields: [users.organisationId], references: [organisations.id] }),
  totpRecoveryCodes: many(totpRecoveryCodes),
}));

export const totpRecoveryCodesRelations = relations(totpRecoveryCodes, ({ one }) => ({
  user: one(users, { fields: [totpRecoveryCodes.userId], references: [users.id] }),
}));

// ── TypeScript row types ───────────────────────────────────────────────────────
export type BestellingType = typeof bestellingTypes.$inferSelect;
export type NewBestellingType = typeof bestellingTypes.$inferInsert;
export type Bestelling = typeof bestellingen.$inferSelect;
export type NewBestelling = typeof bestellingen.$inferInsert;
export type Organisation = typeof organisations.$inferSelect;
export type NewOrganisation = typeof organisations.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type Position = typeof positions.$inferSelect;
export type NewPosition = typeof positions.$inferInsert;
export type TeamMembership = typeof teamMemberships.$inferSelect;
export type TeamPositionCoupling = typeof teamPositionCouplings.$inferSelect;
export type NewTeamPositionCoupling = typeof teamPositionCouplings.$inferInsert;
export type PositionAssignment = typeof positionAssignments.$inferSelect;
export type CompanyPersexBudget = typeof companyPersexBudgets.$inferSelect;
export type NewCompanyPersexBudget = typeof companyPersexBudgets.$inferInsert;
export type FinancialSource = typeof financialSources.$inferSelect;
export type FinancialType = typeof financialTypes.$inferSelect;
export type FinancialSourceAmount = typeof financialSourceAmounts.$inferSelect;
export type FundingAllocation = typeof fundingAllocations.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type User = typeof users.$inferSelect;
export type TotpRecoveryCode = typeof totpRecoveryCodes.$inferSelect;

// FinancialTypeEnum kept as alias for the renamed FinancialTypeCategory (backwards compat)
export type FinancialTypeEnum = FinancialTypeCategory;

export type Salarisschaal = typeof salarisschalen.$inferSelect;
export type NewSalarisschaal = typeof salarisschalen.$inferInsert;

export type Functie = typeof functies.$inferSelect;
export type NewFunctie = typeof functies.$inferInsert;
export type MedewerkerFunctie = typeof medewerkerFuncties.$inferSelect;
export type NewMedewerkerFunctie = typeof medewerkerFuncties.$inferInsert;
