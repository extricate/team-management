import postgres from "postgres";
import { hashPassword } from "../../lib/auth/password";

export default async function globalSetup() {
  const email = process.env.E2E_TEST_EMAIL ?? "admin@example.com";
  const password = process.env.E2E_TEST_PASSWORD;
  const databaseUrl = process.env.DATABASE_URL;

  if (!password) {
    throw new Error(
      "E2E_TEST_PASSWORD is not set. Add it to .env.test (see .env.example for reference).",
    );
  }
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Add it to .env.test.");
  }

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    const hash = await hashPassword(password);
    await sql`
      INSERT INTO users (email, name, role, email_verified, password_hash, is_enabled, failed_login_attempts)
      VALUES (
        ${email},
        'E2E Testgebruiker',
        'admin',
        NOW(),
        ${hash},
        true,
        0
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash        = EXCLUDED.password_hash,
        is_enabled           = true,
        failed_login_attempts = 0,
        locked_until         = NULL
    `;
    console.log(`[e2e] test user ready: ${email}`);
  } finally {
    await sql.end();
  }
}
