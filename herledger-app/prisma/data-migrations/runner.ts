import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is not set.");
    process.exit(1);
  }

  console.log("🚀 Starting data migrations runner...");

  // Initialize database client
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Ensure the DataMigration table exists
    // The schema migration should have created it, but let's double check.
    try {
      await prisma.dataMigration.findMany({ take: 1 });
    } catch (err) {
      console.error("❌ DataMigration table does not exist or database is unreachable.", err);
      process.exit(1);
    }

    // 2. Read migration files
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir);

    // Numbered typescript files like 0001_description.ts
    const migrationFiles = files
      .filter((file) => /^\d{4}_.*\.ts$/.test(file))
      .sort();

    console.log(`📂 Found ${migrationFiles.length} data migration files in directory.`);

    // 3. Fetch already applied migrations
    const appliedMigrations = await prisma.dataMigration.findMany({
      select: { name: true },
    });
    const appliedSet = new Set(appliedMigrations.map((m) => m.name));

    // 4. Run unapplied migrations in order
    let runCount = 0;
    for (const file of migrationFiles) {
      if (appliedSet.has(file)) {
        console.log(`⏩ Skipping already applied migration: ${file}`);
        continue;
      }

      console.log(`🏃 Running data migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      
      // Dynamic import of the typescript migration file
      // In Node/tsx, we can import ES modules directly
      const migrationModule = await import(filePath);
      
      if (typeof migrationModule.up !== "function") {
        throw new Error(`Migration ${file} does not export an 'up' function.`);
      }

      // Execute migration
      const startTime = Date.now();
      await migrationModule.up(prisma);
      const duration = Date.now() - startTime;

      // Record successful execution
      await prisma.dataMigration.create({
        data: { name: file },
      });

      console.log(`✅ Finished ${file} successfully in ${duration}ms.`);
      runCount++;
    }

    if (runCount === 0) {
      console.log("✨ No pending data migrations to apply.");
    } else {
      console.log(`🎉 Successfully applied ${runCount} data migration(s).`);
    }
  } catch (error) {
    console.error("❌ Data migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Unhandled runner error:", err);
  process.exit(1);
});
