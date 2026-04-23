import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}
export function created<T>(data: T) {
  return ok(data, 201);
}
export function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
export function notFound(message = "Not found") {
  return err(message, 404);
}
export function unauthorized(message = "Unauthorized") {
  return err(message, 401);
}
export function forbidden(message = "Forbidden") {
  return err(message, 403);
}
export function badRequest(message: string) {
  return err(message, 400);
}
export function serverError(message = "Internal server error") {
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

type Handler = (...args: unknown[]) => Promise<NextResponse>;

export function withErrorHandling(handler: Handler): Handler {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof AuthError) return unauthorized(error.message);
      console.error("[API error]", error);
      return serverError();
    }
  };
}
