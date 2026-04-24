import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { comments } from "@/lib/db/schema";
import { ok, created, badRequest, requireAuth, withErrorHandling } from "@/lib/api";
import { and, eq } from "drizzle-orm";

const Schema = z.object({
  body: z.string().min(1),
  commentableType: z.enum(["team", "employee", "position", "financialSource", "fundingAllocation"]),
  commentableId: z.string().uuid(),
});

export const GET = withErrorHandling(async (req: unknown) => {
  await requireAuth();
  const url = new URL((req as NextRequest).url);
  const type = url.searchParams.get("type");
  const id = url.searchParams.get("id");

  if (!type || !id) return ok([]);

  const rows = await db.query.comments.findMany({
    where: and(eq(comments.commentableType, type), eq(comments.commentableId, id)),
    with: { createdByUser: true },
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });
  return ok(rows);
}) as (req: Request) => Promise<Response>;

export const POST = withErrorHandling(async (req: unknown) => {
  const session = await requireAuth();
  const body = await (req as NextRequest).json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const [row] = await db.insert(comments).values({ ...parsed.data, createdBy: session.user.id! }).returning();
  return created(row);
}) as (req: Request) => Promise<Response>;
