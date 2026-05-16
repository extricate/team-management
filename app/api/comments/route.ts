import { z } from "zod";
import { db } from "@/lib/db";
import { comments } from "@/lib/db/schema";
import { ok, created, badRequest, unauthorized, requireAuth, withErrorHandling, withMutation } from "@/lib/api";
import { CommentSchema } from "@/lib/schemas";
import { and, eq } from "drizzle-orm";

const CommentsQuerySchema = z.object({
  type: z.enum(["team", "employee", "position", "financialSource", "fundingAllocation", "bestelling"]),
  id: z.string().uuid(),
});

export const GET = withErrorHandling(async (req: Request) => {
  await requireAuth();
  const url = new URL(req.url);
  const rawType = url.searchParams.get("type");
  const rawId = url.searchParams.get("id");

  if (!rawType && !rawId) return ok([]);

  const parsed = CommentsQuerySchema.safeParse({ type: rawType, id: rawId });
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { type, id } = parsed.data;
  const rows = await db.query.comments.findMany({
    where: and(eq(comments.commentableType, type), eq(comments.commentableId, id)),
    with: { createdByUser: true },
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });
  return ok(rows);
});

export const POST = withMutation(CommentSchema, async ({ session, data }) => {
  const userId = session.user?.id;
  if (!userId) return unauthorized();

  const [row] = await db.insert(comments).values({ ...data, createdBy: userId }).returning();
  return created(row);
});
