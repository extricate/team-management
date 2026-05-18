import { ok, created, withMutation, withErrorHandling, requireAuth } from "@/lib/api";
import { FunctieSchema } from "@/lib/schemas";
import { createFunctie, getAllFuncties, getActiveFuncties } from "@/lib/services/functies";

export const GET = withErrorHandling(async (req: Request) => {
  await requireAuth();
  const { searchParams } = new URL(req.url);
  const onlyActive = searchParams.get("active") === "true";
  const rows = onlyActive ? await getActiveFuncties() : await getAllFuncties();
  return ok(rows);
});

export const POST = withMutation(FunctieSchema, async ({ session, data }) => {
  const row = await createFunctie(data, { userId: session.user?.id });
  return created(row);
});
