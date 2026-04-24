import { db } from "./index";
import { users } from "./schema";
import { eq } from "drizzle-orm";

async function seed() {
  const adminEmail = "admin@example.com";
  const adminName = "Administrator";

  try {
    // Check if admin user already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log("✓ Default admin user already exists");
      return;
    }

    // Create default admin user
    const result = await db
      .insert(users)
      .values({
        email: adminEmail,
        name: adminName,
        role: "admin",
        emailVerified: new Date(),
      })
      .returning();

    console.log("✓ Default admin user created successfully");
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Name: ${adminName}`);
    console.log(`  Role: admin`);
  } catch (error) {
    console.error("✗ Error seeding admin user:", error);
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
