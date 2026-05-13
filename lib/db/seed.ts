import { fileURLToPath } from "url";
import { db } from "./index";
import { users, bestellingTypes, salarisschalen } from "./schema";
import { eq } from "drizzle-orm";
import { hashPassword, generatePassword } from "../auth/password";

const DEFAULT_SALARISSCHALEN = [
  { schaalCode: "7",  year: 2026, primaryCost: "73405.00",  secondaryEffects: "6966.00",  tertiaryEffects: "29782.00" },
  { schaalCode: "8",  year: 2026, primaryCost: "79985.00",  secondaryEffects: "7591.00",  tertiaryEffects: "31443.00" },
  { schaalCode: "9",  year: 2026, primaryCost: "90736.00",  secondaryEffects: "8611.00",  tertiaryEffects: "34157.00" },
  { schaalCode: "10", year: 2026, primaryCost: "96704.00",  secondaryEffects: "9177.00",  tertiaryEffects: "35663.00" },
  { schaalCode: "11", year: 2026, primaryCost: "113397.00", secondaryEffects: "10761.00", tertiaryEffects: "39877.00" },
  { schaalCode: "12", year: 2026, primaryCost: "126925.00", secondaryEffects: "12045.00", tertiaryEffects: "43292.00" },
  { schaalCode: "13", year: 2026, primaryCost: "142251.00", secondaryEffects: "5875.00",  tertiaryEffects: "37013.00" },
];

const DEFAULT_BESTELLING_TYPES = [
  { naam: "Hardware", omschrijving: "Laptops, servers, randapparatuur en overige fysieke ICT-middelen" },
  { naam: "Software / licenties", omschrijving: "Softwarelicenties, SaaS-abonnementen en cloudplatforms" },
  { naam: "Inhuur extern", omschrijving: "Inhuur van externe medewerkers en ZZP'ers" },
  { naam: "Advies & consultancy", omschrijving: "Adviesopdrachten en consultancytrajecten" },
  { naam: "Opleiding & training", omschrijving: "Cursussen, trainingen en certificeringen" },
  { naam: "Kantoorinrichting", omschrijving: "Meubilair, werkplekvoorzieningen en aanverwante artikelen" },
  { naam: "Overig", omschrijving: "Bestellingen die niet onder een andere categorie vallen" },
];

export async function createAdminUser(
  email: string,
  name: string | undefined,
  generatePw: () => string = () => generatePassword(20),
): Promise<{ created: true; password: string } | { created: false }> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return { created: false };
  }

  const password = generatePw();
  const passwordHash = await hashPassword(password);

  await db.insert(users).values({
    email,
    name,
    role: "admin",
    emailVerified: new Date(),
    passwordHash,
  });

  return { created: true, password };
}

async function seed() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminName  = process.env.ADMIN_NAME;

  if (!adminEmail) {
    console.error("✗ ADMIN_EMAIL environment variable is required");
    process.exit(1);
  }

  try {
    const result = await createAdminUser(adminEmail, adminName);

    if (result.created) {
      console.log("");
      console.log("┌─────────────────────────────────────────────────┐");
      console.log("│           Admin account aangemaakt               │");
      console.log("├─────────────────────────────────────────────────┤");
      console.log(`│  E-mail  : ${adminEmail.padEnd(37)} │`);
      console.log(`│  Wachtwoord: ${result.password.padEnd(35)} │`);
      console.log("│                                                  │");
      console.log("│  Sla dit wachtwoord op — het wordt niet opnieuw  │");
      console.log("│  getoond.                                        │");
      console.log("└─────────────────────────────────────────────────┘");
      console.log("");
    } else {
      console.log("✓ Admin user bestaat al, overgeslagen");
    }

    const existingTypes = await db.select().from(bestellingTypes).limit(1);
    if (existingTypes.length > 0) {
      console.log("✓ Bestelling types al aanwezig");
    } else {
      await db.insert(bestellingTypes).values(DEFAULT_BESTELLING_TYPES);
      console.log(`✓ Bestelling types aangemaakt (${DEFAULT_BESTELLING_TYPES.length})`);
    }

    const existingSchalen = await db.select().from(salarisschalen).limit(1);
    if (existingSchalen.length > 0) {
      console.log("✓ Salarisschalen al aanwezig");
    } else {
      await db.insert(salarisschalen).values(DEFAULT_SALARISSCHALEN);
      console.log(`✓ Salarisschalen aangemaakt (${DEFAULT_SALARISSCHALEN.length})`);
    }
  } catch (error) {
    console.error("✗ Fout bij seeden:", error);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed()
    .then(() => {
      console.log("✓ Seed voltooid");
      process.exit(0);
    })
    .catch((error) => {
      console.error("✗ Seed mislukt:", error);
      process.exit(1);
    });
}
