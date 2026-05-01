import { z } from "zod";

// ── Shared field helpers ───────────────────────────────────────────────────────
export const uuidField = z.string().uuid();
export const optionalUuid = z.string().uuid().optional();
export const name200 = z.string().min(1).max(200);
export const optionalName200 = z.string().min(1).max(200).optional();
export const optionalDatetime = z.string().datetime().optional();
export const nullableDatetime = z.string().datetime().optional().nullable();

// ── Date parsing helpers ───────────────────────────────────────────────────────
// Converts an optional ISO string to Date (undefined if absent).
export function parseDate(val: string | undefined): Date | undefined {
  return val ? new Date(val) : undefined;
}

// Converts an optional-or-null ISO string: null → null, undefined → undefined, string → Date.
// Used in PATCH handlers where null means "clear the field" and undefined means "leave it".
export function parseNullableDate(val: string | null | undefined): Date | null | undefined {
  if (val === null) return null;
  if (val === undefined) return undefined;
  return new Date(val);
}

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

// ── Employee ───────────────────────────────────────────────────────────────────
export const EmployeeSchema = z.object({
  organisationId: uuidField,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  prefixName: z.string().max(20).optional(),
});

export const EmployeeUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  prefixName: z.string().max(20).optional().nullable(),
  organisationId: optionalUuid,
});

// ── Position ───────────────────────────────────────────────────────────────────
export const PositionSchema = z.object({
  teamId: uuidField,
  type: z.string().min(1),
  opfType: z.string().optional().nullable(),
  positionCode: z.string().optional(),
  schaal: z.string().optional(),
  annualCost: z.number().positive().optional(),
  status: z.enum(["planned", "open", "filled", "closed"]).default("planned"),
  expectedStart: optionalDatetime,
  expectedEnd: optionalDatetime,
  requiredBefore: optionalDatetime,
});

export const PositionUpdateSchema = z.object({
  teamId: optionalUuid,
  type: z.string().min(1).optional(),
  opfType: z.string().optional().nullable(),
  positionCode: z.string().optional().nullable(),
  schaal: z.string().optional().nullable(),
  annualCost: z.number().positive().optional().nullable(),
  status: z.enum(["planned", "open", "filled", "closed"]).optional(),
  expectedStart: nullableDatetime,
  expectedEnd: nullableDatetime,
  requiredBefore: nullableDatetime,
});

// ── TeamMembership ─────────────────────────────────────────────────────────────
export const TeamMembershipSchema = z.object({
  teamId: uuidField,
  employeeId: uuidField,
  startDate: z.string().datetime(),
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
  startDate: z.string().datetime(),
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

// ── FinancialSourceAmount ──────────────────────────────────────────────────────
export const FinancialSourceAmountSchema = z.object({
  financialSourceId: uuidField,
  financialTypeId: uuidField,
  amount: z.number().positive(),
  status: z.enum(["concept", "released"]).default("concept"),
  effectiveDate: optionalDatetime,
  releaseDate: optionalDatetime,
});

// ── FundingAllocation ──────────────────────────────────────────────────────────
export const FundingAllocationSchema = z.object({
  financialSourceAmountId: uuidField,
  positionId: optionalUuid,
  teamId: optionalUuid,
  amount: z.string().optional(),
  percentage: z.string().optional(),
  startDate: optionalDatetime,
  endDate: optionalDatetime,
  reason: z.string().optional(),
}).refine(d => d.positionId || d.teamId, { message: "positionId or teamId required" });

export const FundingAllocationUpdateSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(),
  percentage: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(),
  startDate: nullableDatetime,
  endDate: nullableDatetime,
  status: z.enum(["active", "reallocated", "expired"]).optional(),
  reason: z.string().optional().nullable(),
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
  role: z.enum(["admin", "manager", "viewer"]).default("viewer"),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "manager", "viewer"]).optional(),
  organisationId: optionalUuid,
});
