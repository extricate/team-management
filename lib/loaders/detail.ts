import { db } from "@/lib/db";
import { comments, auditEvents } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

export type DetailEntityType =
  | "team"
  | "employee"
  | "position"
  | "financialSource"
  | "fundingAllocation"
  | "bestelling"
  | "teamMembership"
  | "positionAssignment";

// Fetches comments and audit log for any entity in a single parallel call.
// Detail pages call this once instead of repeating the same two queries.
export async function fetchDetailSidebar(entityType: DetailEntityType, entityId: string) {
  const [entityComments, audit] = await Promise.all([
    db.query.comments.findMany({
      where: and(eq(comments.commentableType, entityType), eq(comments.commentableId, entityId)),
      with: { createdByUser: true },
      orderBy: [desc(comments.createdAt)],
    }),
    db.query.auditEvents.findMany({
      where: and(eq(auditEvents.entityType, entityType), eq(auditEvents.entityId, entityId)),
      with: { actorUser: true },
      orderBy: [desc(auditEvents.createdAt)],
      limit: 50,
    }),
  ]);
  return { comments: entityComments, audit };
}
