/**
 * purge-audit: deletes audit_events older than AUDIT_RETENTION_DAYS (default: 730 days / 2 years).
 *
 * Run via: npm run db:purge-audit
 *
 * Schedule this as a K8s CronJob (e.g. monthly) in production:
 *
 *   apiVersion: batch/v1
 *   kind: CronJob
 *   metadata:
 *     name: purge-audit
 *   spec:
 *     schedule: "0 2 1 * *"   # 02:00 on the 1st of each month
 *     jobTemplate:
 *       spec:
 *         template:
 *           spec:
 *             restartPolicy: OnFailure
 *             containers:
 *               - name: purge
 *                 image: <migrator-image>
 *                 command: ["node", "--env-file=/etc/secrets/.env", "scripts/purge-audit.mjs"]
 */

import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

const retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS ?? "730", 10);
if (isNaN(retentionDays) || retentionDays < 1) {
  console.error("ERROR: AUDIT_RETENTION_DAYS must be a positive integer.");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

async function main() {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  console.log(`Purging audit_events older than ${cutoff.toISOString()} (${retentionDays} days retention)`);

  const result = await sql`
    DELETE FROM audit_events
    WHERE created_at < ${cutoff}
    RETURNING id
  `;

  console.log(`Deleted ${result.length} audit event(s).`);
  await sql.end();
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
