// Only reachable in test environments — guarded at runtime
export default function TestErrorPage(): never {
  if (process.env.NODE_ENV === "production") {
    throw Object.assign(new Error("Not found"), { statusCode: 404 });
  }
  throw new Error("Deliberate test error");
}
