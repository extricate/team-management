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

export async function logAudit(params: AuditParams) {
  await db.insert(auditEvents).values({
    actorUserId: params.actorUserId,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    beforeJson: (params.before ?? null) as Record<string, unknown> | null,
    afterJson: (params.after ?? null) as Record<string, unknown> | null,
    reason: params.reason,
  });
}

export function createAuditLogger(actorUserId: string | undefined) {
  return (params: Omit<AuditParams, "actorUserId">) =>
    logAudit({ ...params, actorUserId });
}
