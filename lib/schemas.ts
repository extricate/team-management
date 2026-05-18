import { z } from "zod";

// ── Shared field helpers ───────────────────────────────────────────────────────
export const uuidField = z.string().uuid();
export const optionalUuid = z.string().uuid().optional();
export const name200 = z.string().min(1).max(200);
export const optionalName200 = z.string().min(1).max(200).optional();
export const requiredDatetime = z.string().datetime().transform(val => new Date(val));
export const optionalDatetime = z.string().datetime().optional().transform(val => val ? new Date(val) : undefined);
export const nullableDatetime = z.string().datetime().optional().nullable().transform(val => val === null ? null : val ? new Date(val) : undefined);

// ── Organisation ───────────────────────────────────────────────────────────────
export const OrganisationSchema = z.object({
  name: name200,
  type: z.enum(["OS1", "OS2"]),
});

export const OrganisationUpdateSchema = z.object({
  name: optionalName200,
  type: z.enum(["OS1", "OS2"]).optional(),
});

// ── Team ───────────────────────────────────────────────────────────────────────
export const TeamSchema = z.object({
  organisationId: uuidField,
  name: name200,
  description: z.string().optional(),
});

export const TeamUpdateSchema = z.object({
  name: optionalName200,
  description: z.string().optional(),
  organisationId: optionalUuid,
});

export const BulkTeamSchema = z.object({
  organisationId: uuidField,
  names: z.array(name200).min(1).max(100),
});

// ── Employee ───────────────────────────────────────────────────────────────────
export const EmployeeSchema = z.object({
  organisationId: uuidField,
  personeelsnummer: z.string().min(1).max(50).optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  prefixName: z.string().max(20).optional(),
});

export const EmployeeUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  prefixName: z.string().max(20).optional().nullable(),
  personeelsnummer: z.string().min(1).max(50).optional().nullable(),
  organisationId: optionalUuid,
});

// ── Position ───────────────────────────────────────────────────────────────────
export const POSITION_STATUSES = ["gepland", "gewenst", "toegezegd", "open", "gevuld", "gesloten"] as const;

export const PositionSchema = z.object({
  organisationId: uuidField,
  bestellingId: z.string().uuid().optional().nullable(),
  functieId: z.string().uuid().optional().nullable(),
  // type kept for legacy fallback; new positions use functieId
  type: z.string().min(1).optional().nullable(),
  roltitel: z.string().min(1).max(200).optional().nullable(),
  opfType: z.string().optional().nullable(),
  positionCode: z.string().optional().nullable(),
  schaal: z.string().optional().nullable(),
  annualCost: z.number().positive().optional().nullable().transform(val => val != null ? String(val) : undefined),
  status: z.enum(POSITION_STATUSES).default("gepland"),
  expectedStart: nullableDatetime,
  expectedEnd: nullableDatetime,
  requiredBefore: nullableDatetime,
});

export const PositionUpdateSchema = z.object({
  bestellingId: z.string().uuid().optional().nullable(),
  functieId: z.string().uuid().optional().nullable(),
  type: z.string().min(1).optional().nullable(),
  roltitel: z.string().min(1).max(200).optional().nullable(),
  opfType: z.string().optional().nullable(),
  positionCode: z.string().optional().nullable(),
  schaal: z.string().optional().nullable(),
  annualCost: z.number().positive().optional().nullable().transform(val => val == null ? val : String(val)),
  status: z.enum(POSITION_STATUSES).optional(),
  expectedStart: nullableDatetime,
  expectedEnd: nullableDatetime,
  requiredBefore: nullableDatetime,
});

// ── TeamPositionCoupling ───────────────────────────────────────────────────────
export const TeamPositionCouplingSchema = z.object({
  teamId: uuidField,
  positionId: uuidField,
  startDate: requiredDatetime,
  endDate: optionalDatetime,
});

export const TeamPositionCouplingUpdateSchema = z.object({
  endDate: nullableDatetime,
});

// ── TeamMembership ─────────────────────────────────────────────────────────────
export const TeamMembershipSchema = z.object({
  teamId: uuidField,
  employeeId: uuidField,
  startDate: requiredDatetime,
  endDate: optionalDatetime,
  reason: z.string().optional(),
});

export const TeamMembershipUpdateSchema = z.object({
  status: z.enum(["active", "ended"]).optional(),
  startDate: optionalDatetime,
  endDate: nullableDatetime,
  reason: z.string().optional().nullable(),
});

// ── PositionAssignment ─────────────────────────────────────────────────────────
export const PositionAssignmentSchema = z.object({
  positionId: uuidField,
  employeeId: uuidField,
  startDate: requiredDatetime,
  endDate: optionalDatetime,
  reason: z.string().optional(),
});

// ── FinancialSource ────────────────────────────────────────────────────────────
export const FinancialSourceSchema = z.object({
  organisationId: uuidField,
  projectId: z.string().min(1).max(100),
  name: name200,
});

export const FinancialSourceUpdateSchema = z.object({
  projectId: z.string().min(1).max(100).optional(),
  name: optionalName200,
  organisationId: optionalUuid,
});

// ── CompanyPersexBudget ────────────────────────────────────────────────────────
export const CompanyPersexBudgetSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  amount: z.number().nonnegative(),
  status: z.enum(["concept", "released"]).default("concept"),
});

export const CompanyPersexBudgetUpdateSchema = z.object({
  amount: z.number().nonnegative().optional(),
  status: z.enum(["concept", "released"]).optional(),
});

// ── FinancialSourceAmount ──────────────────────────────────────────────────────
export const FinancialSourceAmountSchema = z.object({
  financialSourceId: uuidField,
  financialTypeId: uuidField,
  amount: z.number().positive(),
  status: z.enum(["concept", "released"]).default("concept"),
  effectiveDate: optionalDatetime,
  releaseDate: optionalDatetime,
});

// ── Bestelling ─────────────────────────────────────────────────────────────────
export const BestellingSchema = z.object({
  organisationId: uuidField,
  typeId: uuidField,
  atbNummer: z.string().min(1).max(100),
  omschrijving: z.string().min(1).max(500),
  geraamdBedrag: z.number().positive().optional(),
  werkelijkBedrag: z.number().positive().optional(),
  aanvraagDatum: optionalDatetime,
  notities: z.string().optional(),
});

export const BestellingUpdateSchema = z.object({
  typeId: optionalUuid,
  atbNummer: z.string().min(1).max(100).optional(),
  omschrijving: z.string().min(1).max(500).optional(),
  geraamdBedrag: z.number().positive().optional().nullable(),
  werkelijkBedrag: z.number().positive().optional().nullable(),
  aanvraagDatum: nullableDatetime,
  notities: z.string().optional().nullable(),
});

// ── FundingAllocation ──────────────────────────────────────────────────────────
export const FundingAllocationSchema = z.object({
  financialSourceAmountId: optionalUuid,
  companyPersexBudgetId: optionalUuid,
  positionId: optionalUuid,
  teamId: optionalUuid,
  bestellingId: optionalUuid,
  amount: z.string().optional(),
  percentage: z.string().optional(),
  startDate: optionalDatetime,
  endDate: optionalDatetime,
  reason: z.string().optional(),
})
  .refine(d => d.positionId || d.teamId || d.bestellingId, { message: "positionId, teamId, or bestellingId required" })
  .refine(d => !!(d.financialSourceAmountId) !== !!(d.companyPersexBudgetId), { message: "exactly one of financialSourceAmountId or companyPersexBudgetId required" });

export const FundingAllocationUpdateSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(),
  percentage: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(),
  startDate: nullableDatetime,
  endDate: nullableDatetime,
  status: z.enum(["active", "reallocated", "expired"]).optional(),
  reason: z.string().optional().nullable(),
});

// ── Functie ────────────────────────────────────────────────────────────────────
export const FunctieSchema = z.object({
  titel: z.string().min(1).max(200),
  schaalCode: z.string().min(1).max(20).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const FunctieUpdateSchema = z.object({
  titel: z.string().min(1).max(200).optional(),
  schaalCode: z.string().min(1).max(20).optional().nullable(),
  isActive: z.boolean().optional(),
});

// ── MedewerkerFunctie ──────────────────────────────────────────────────────────
export const MedewerkerFunctieSchema = z.object({
  functieId: uuidField,
  isPrimary: z.boolean().default(false),
  startDate: requiredDatetime,
  endDate: optionalDatetime,
  reason: z.string().optional(),
});

export const MedewerkerFunctieUpdateSchema = z.object({
  isPrimary: z.boolean().optional(),
  endDate: nullableDatetime,
  status: z.enum(["active", "ended"]).optional(),
  reason: z.string().optional().nullable(),
});

// ── Salarisschaal ──────────────────────────────────────────────────────────────
export const SalarisschaalSchema = z.object({
  schaalCode: z.string().min(1).max(20),
  year: z.number().int().min(2000).max(2100),
  primaryCost: z.number().nonnegative().transform(val => String(val)),
  secondaryEffects: z.number().nonnegative().default(0).transform(val => String(val)),
  tertiaryEffects: z.number().nonnegative().default(0).transform(val => String(val)),
});

export const SalarisschaalUpdateSchema = z.object({
  schaalCode: z.string().min(1).max(20).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  primaryCost: z.number().nonnegative().optional().transform(val => val != null ? String(val) : undefined),
  secondaryEffects: z.number().nonnegative().optional().transform(val => val != null ? String(val) : undefined),
  tertiaryEffects: z.number().nonnegative().optional().transform(val => val != null ? String(val) : undefined),
});

// ── Comment ────────────────────────────────────────────────────────────────────
export const CommentSchema = z.object({
  body: z.string().min(1),
  commentableType: z.enum(["team", "employee", "position", "financialSource", "fundingAllocation"]),
  commentableId: uuidField,
});

// ── User ───────────────────────────────────────────────────────────────────────
export const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(12, "Wachtwoord moet minimaal 12 tekens bevatten"),
  role: z.enum(["admin", "manager", "viewer"]).default("viewer"),
  organisationId: optionalUuid,
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "manager", "viewer"]).optional(),
  organisationId: optionalUuid,
  isEnabled: z.boolean().optional(),
  password: z.string().min(12, "Wachtwoord moet minimaal 12 tekens bevatten").optional(),
});

export const UpdateMyPreferencesSchema = z.object({
  defaultOrganisationId: z.string().uuid().nullable(),
});

// ── ChangePassword ─────────────────────────────────────────────────────────────
export const ChangePasswordSchema = z
  .object({
    password: z.string().min(12, "Wachtwoord moet minimaal 12 tekens bevatten"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Wachtwoorden komen niet overeen",
    path: ["confirmPassword"],
  });
