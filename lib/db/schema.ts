import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  primaryKey,
  numeric,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// ── Users ──────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  role: text("role").notNull().default("viewer"), // admin | manager | viewer
  organisationId: uuid("organisation_id"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
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
  type: text("type").notNull(), // OS1 | OS2
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
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  prefixName: text("prefix_name"),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Positions ──────────────────────────────────────────────────────────────────
export const positions = pgTable("positions", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id),
  type: text("type").notNull(), // e.g. OPF1, OPF2, OPF3
  positionCode: text("position_code"),
  status: text("status").notNull().default("planned"), // planned | open | filled | closed
  expectedStart: timestamp("expected_start", { mode: "date" }),
  expectedEnd: timestamp("expected_end", { mode: "date" }),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
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
  status: text("status").notNull().default("active"), // active | ended
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
  status: text("status").notNull().default("active"), // active | ended
  reason: text("reason"),
  createdBy: uuid("created_by").references(() => users.id),
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
  type: text("type").notNull(), // PERSEX | MATEX | Investeringen
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
  status: text("status").notNull().default("concept"), // concept | released
  effectiveDate: timestamp("effective_date", { mode: "date" }),
  releaseDate: timestamp("release_date", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Funding Allocations (source amount → position or team) ────────────────────
export const fundingAllocations = pgTable("funding_allocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  financialSourceAmountId: uuid("financial_source_amount_id").notNull().references(() => financialSourceAmounts.id),
  positionId: uuid("position_id").references(() => positions.id),
  teamId: uuid("team_id").references(() => teams.id),
  amount: numeric("amount", { precision: 15, scale: 2 }),
  percentage: numeric("percentage", { precision: 5, scale: 2 }),
  startDate: timestamp("start_date", { mode: "date" }),
  endDate: timestamp("end_date", { mode: "date" }),
  status: text("status").notNull().default("active"), // active | reallocated | expired
  reason: text("reason"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Comments (polymorphic) ─────────────────────────────────────────────────────
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  body: text("body").notNull(),
  commentableType: text("commentable_type").notNull(), // team | employee | position | financialSource | fundingAllocation
  commentableId: uuid("commentable_id").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Audit Events ───────────────────────────────────────────────────────────────
export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  entityType: text("entity_type").notNull(), // organisation | team | employee | position | ...
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(), // create | update | delete | archive | assign | reallocate
  beforeJson: jsonb("before_json"),
  afterJson: jsonb("after_json"),
  reason: text("reason"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Drizzle Relations ──────────────────────────────────────────────────────────
export const organisationsRelations = relations(organisations, ({ many }) => ({
  teams: many(teams),
  employees: many(employees),
  financialSources: many(financialSources),
  users: many(users),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  organisation: one(organisations, { fields: [teams.organisationId], references: [organisations.id] }),
  positions: many(positions),
  memberships: many(teamMemberships),
  fundingAllocations: many(fundingAllocations),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  organisation: one(organisations, { fields: [employees.organisationId], references: [organisations.id] }),
  memberships: many(teamMemberships),
  positionAssignments: many(positionAssignments),
}));

export const positionsRelations = relations(positions, ({ one, many }) => ({
  team: one(teams, { fields: [positions.teamId], references: [teams.id] }),
  assignments: many(positionAssignments),
  fundingAllocations: many(fundingAllocations),
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
  financialType: one(financialTypes, { fields: [financialSourceAmounts.financialTypeId], references: [financialTypes.id] }),
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
  position: one(positions, { fields: [fundingAllocations.positionId], references: [positions.id] }),
  team: one(teams, { fields: [fundingAllocations.teamId], references: [teams.id] }),
  createdByUser: one(users, { fields: [fundingAllocations.createdBy], references: [users.id] }),
}));

// ── TypeScript Types ───────────────────────────────────────────────────────────
export type Organisation = typeof organisations.$inferSelect;
export type NewOrganisation = typeof organisations.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type Position = typeof positions.$inferSelect;
export type NewPosition = typeof positions.$inferInsert;
export type TeamMembership = typeof teamMemberships.$inferSelect;
export type PositionAssignment = typeof positionAssignments.$inferSelect;
export type FinancialSource = typeof financialSources.$inferSelect;
export type FinancialType = typeof financialTypes.$inferSelect;
export type FinancialSourceAmount = typeof financialSourceAmounts.$inferSelect;
export type FundingAllocation = typeof fundingAllocations.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type User = typeof users.$inferSelect;

export type CommentableType = "team" | "employee" | "position" | "financialSource" | "fundingAllocation";
export type PositionStatus = "planned" | "open" | "filled" | "closed";
export type AllocationStatus = "active" | "reallocated" | "expired";
export type AmountStatus = "concept" | "released";
export type FinancialTypeEnum = "PERSEX" | "MATEX" | "Investeringen";
export type OrganisationType = "OS1" | "OS2";
export type UserRole = "admin" | "manager" | "viewer";
