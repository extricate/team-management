import { db } from "./index";
import { users, bestellingTypes } from "./schema";
import { eq } from "drizzle-orm";

const DEFAULT_BESTELLING_TYPES = [
  { naam: "Hardware", omschrijving: "Laptops, servers, randapparatuur en overige fysieke ICT-middelen" },
  { naam: "Software / licenties", omschrijving: "Softwarelicenties, SaaS-abonnementen en cloudplatforms" },
  { naam: "Inhuur extern", omschrijving: "Inhuur van externe medewerkers en ZZP'ers" },
  { naam: "Advies & consultancy", omschrijving: "Adviesopdrachten en consultancytrajecten" },
  { naam: "Opleiding & training", omschrijving: "Cursussen, trainingen en certificeringen" },
  { naam: "Kantoorinrichting", omschrijving: "Meubilair, werkplekvoorzieningen en aanverwante artikelen" },
  { naam: "Overig", omschrijving: "Bestellingen die niet onder een andere categorie vallen" },
];

async function seed() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminName  = process.env.ADMIN_NAME;

  if (!adminEmail) {
    console.error("✗ ADMIN_EMAIL environment variable is required");
    process.exit(1);
  }

  try {
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log("✓ Default admin user already exists");
    } else {
      await db
        .insert(users)
        .values({
          email: adminEmail,
          name: adminName,
          role: "admin",
          emailVerified: new Date(),
        });

      console.log("✓ Default admin user created successfully");
      console.log(`  Email: ${adminEmail}`);
      console.log(`  Name: ${adminName}`);
      console.log(`  Role: admin`);
    }

    const existingTypes = await db.select().from(bestellingTypes).limit(1);
    if (existingTypes.length > 0) {
      console.log("✓ Bestelling types already seeded");
    } else {
      await db.insert(bestellingTypes).values(DEFAULT_BESTELLING_TYPES);
      console.log(`✓ Bestelling types seeded (${DEFAULT_BESTELLING_TYPES.length})`);
    }
  } catch (error) {
    console.error("✗ Error seeding:", error);
    process.exit(1);
  }
}

seed()
  .then(() => {
    console.log("✓ Seed completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("✗ Seed failed:", error);
    process.exit(1);
  });
