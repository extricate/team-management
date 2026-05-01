import { db } from "@/lib/db";
import { comments } from "@/lib/db/schema";
import { ok, created, badRequest, unauthorized, requireAuth, withErrorHandling } from "@/lib/api";
import { CommentSchema } from "@/lib/schemas";
import type { CommentableType } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export const GET = withErrorHandling(async (req: Request) => {
  await requireAuth();
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const id = url.searchParams.get("id");

  if (!type || !id) return ok([]);

  const rows = await db.query.comments.findMany({
    where: and(eq(comments.commentableType, type as CommentableType), eq(comments.commentableId, id)),
    with: { createdByUser: true },
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });
  return ok(rows);
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const userId = session.user?.id;
  if (!userId) return unauthorized();

  const body = await req.json();
  const parsed = CommentSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const [row] = await db.insert(comments).values({ ...parsed.data, createdBy: userId }).returning();
  return created(row);
});
