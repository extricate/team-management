import { db } from "@/lib/db";
import { employees, organisations } from "@/lib/db/schema";
import { ok, badRequest, payloadTooLarge, requireAuth, withErrorHandling } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { syncEmployee } from "@/lib/search/sync";
import { and, eq, isNull } from "drizzle-orm";

// Minimal CSV parser — handles quoted fields, \r\n and \n, skips blank rows.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const flushField = () => { row.push(field.trim()); field = ""; };
  const flushRow = () => {
    flushField();
    if (row.some(f => f !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      flushField();
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      flushRow();
    } else if (ch === '\n') {
      flushRow();
    } else {
      field += ch;
    }
  }
  flushRow();
  return rows;
}

const REQUIRED_COLUMNS = ["voornaam", "achternaam", "organisatie"] as const;

const MAX_CSV_BYTES = 2 * 1024 * 1024; // 2 MB

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return badRequest("Verwacht multipart/form-data.");
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof Blob)) return badRequest("Geen bestand aangeleverd.");

  if (file.size > MAX_CSV_BYTES) {
    return payloadTooLarge(`Bestand te groot (max ${MAX_CSV_BYTES / 1024 / 1024} MB).`);
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) return badRequest("CSV bevat geen data na de header.");

  const headers = rows[0].map(h => h.toLowerCase().trim());
  for (const col of REQUIRED_COLUMNS) {
    if (!headers.includes(col)) return badRequest(`Kolom "${col}" ontbreekt in de header.`);
  }

  const col = (name: string) => headers.indexOf(name);
  const tussenIdx = col("tussenvoegsel");
  const persNrIdx = col("personeelsnummer");

  const allOrgs = await db.select().from(organisations).where(isNull(organisations.deletedAt));
  const orgByName = new Map(allOrgs.map(o => [o.name.toLowerCase(), o]));
  const orgById   = new Map(allOrgs.map(o => [o.id, o]));

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const firstName       = row[col("voornaam")]?.trim();
    const lastName        = row[col("achternaam")]?.trim();
    const prefixName      = tussenIdx >= 0 ? (row[tussenIdx]?.trim() || null) : null;
    const personeelsnummer = persNrIdx >= 0 ? (row[persNrIdx]?.trim() || null) : null;
    const orgRef          = row[col("organisatie")]?.trim();

    if (!firstName || !lastName || !orgRef) {
      results.errors.push(`Rij ${i + 1}: voornaam, achternaam en organisatie zijn verplicht.`);
      continue;
    }

    const org = orgByName.get(orgRef.toLowerCase()) ?? orgById.get(orgRef);
    if (!org) {
      results.errors.push(`Rij ${i + 1}: organisatie "${orgRef}" niet gevonden.`);
      continue;
    }

    const existing = await db.query.employees.findFirst({
      where: and(
        eq(employees.firstName, firstName),
        eq(employees.lastName, lastName),
        eq(employees.organisationId, org.id),
        isNull(employees.deletedAt),
      ),
    });

    if (existing) { results.skipped++; continue; }

    const [newEmp] = await db.insert(employees).values({
      firstName,
      lastName,
      prefixName,
      personeelsnummer,
      organisationId: org.id,
    }).returning();

    await logAudit({
      actorUserId: session.user?.id,
      entityType: "employee",
      entityId: newEmp.id,
      action: "create",
      after: newEmp as Record<string, unknown>,
    });

    syncEmployee(newEmp.id).catch(err => console.error("[search sync]", err));
    results.created++;
  }

  return ok(results);
});
