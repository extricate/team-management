import { db } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";

type AuditAction = "create" | "update" | "delete" | "archive" | "assign" | "reallocate";

interface AuditParams {
  actorUserId?: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
  reason?: string;
}

const SENSITIVE_FIELDS = new Set(["passwordHash", "totpSecret", "totpBackupCodes"]);

function stripSensitiveFields(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    result[k] = SENSITIVE_FIELDS.has(k) ? "[REDACTED]" : v;
  }
  return result;
}

export async function logAudit(params: AuditParams) {
  await db.insert(auditEvents).values({
    actorUserId: params.actorUserId,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    beforeJson: (stripSensitiveFields(params.before) ?? null) as Record<string, unknown> | null,
    afterJson: (stripSensitiveFields(params.after) ?? null) as Record<string, unknown> | null,
    reason: params.reason,
  });
}
