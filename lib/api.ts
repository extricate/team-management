import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Shared route context type for dynamic segments — avoids repeating this in every [id] route.
export type RouteContext = { params: Promise<{ id: string }> };

export function ok<T>(data: T, status = 200): Response {
  return NextResponse.json({ data }, { status });
}
export function created<T>(data: T): Response {
  return ok(data, 201);
}
export function err(message: string, status: number): Response {
  return NextResponse.json({ error: message }, { status });
}
export function notFound(message = "Not found"): Response {
  return err(message, 404);
}
export function unauthorized(message = "Unauthorized"): Response {
  return err(message, 401);
}
export function forbidden(message = "Forbidden"): Response {
  return err(message, 403);
}
export function badRequest(message: string): Response {
  return err(message, 400);
}
export function conflict(message: string): Response {
  return err(message, 409);
}
export function serverError(message = "Internal server error"): Response {
  return err(message, 500);
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new AuthError("Not authenticated");
  return session;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Toegang geweigerd") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// Throws ForbiddenError when the session user's organisation differs from the entity's organisation.
// Bypassed for admins and for users with no organisationId (application-level owners with global access).
// Pass null/undefined entityOrgId to skip (entity is not org-scoped).
export function assertOrgAccess(
  session: { user?: { role?: string | null; organisationId?: string | null } | null },
  entityOrgId: string | null | undefined,
): void {
  if (!entityOrgId) return;
  const user = session.user;
  if (user?.role === "admin") return;
  if (!user?.organisationId) return;
  if (user.organisationId !== entityOrgId) {
    throw new ForbiddenError("Toegang geweigerd: u hebt geen toegang tot deze organisatie.");
  }
}

// Generic wrapper so TypeScript infers the exact handler signature — no casts needed at the call site.
export function withErrorHandling<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response>
): (...args: TArgs) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof AuthError) return unauthorized(error.message);
      if (error instanceof ForbiddenError) return forbidden(error.message);
      if (error instanceof Error && "status" in error && typeof (error as { status: unknown }).status === "number") {
        return err(error.message, (error as { status: number }).status);
      }
      console.error("[API error]", error);
      return serverError();
    }
  };
}
