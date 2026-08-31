import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "..");
const schemaPath = path.join(rootDir, "prisma", "schema.prisma");
const migrationsDir = path.join(rootDir, "prisma", "migrations");

function main() {
  console.log("🔍 Validating database schema and migrations...");

  // 1. Check if there are any uncommitted schema changes (not in migrations)
  console.log("➡️ Checking for unapplied schema changes...");

  // Use the same environment variables or rely on GHA setup
  const diffResult = spawnSync(
    "npx",
    [
      "prisma",
      "migrate",
      "diff",
      "--exit-code",
      "--from-migrations",
      migrationsDir,
      "--to-schema",
      schemaPath,
    ],
    {
      cwd: rootDir,
      env: process.env,
      encoding: "utf-8",
    }
  );

  // Prisma migrate diff exit codes:
  // 0 = no differences
  // 1 = error
  // 2 = differences detected
  if (diffResult.status === 2) {
    console.error("❌ Schema changes detected that are not committed as migration files.");
    console.error(
      "   Please run 'pnpm db:migrate:dev' locally and commit the resulting migration folder."
    );
    process.exit(1);
  } else if (diffResult.status !== 0) {
    console.error("❌ Error running prisma migrate diff:");
    console.error(diffResult.stderr || diffResult.stdout);
    process.exit(1);
  }

  console.log("✅ Schema matches committed migrations.");

  // 2. Scan all migrations for unsafe additions of non-nullable columns without defaults
  console.log("➡️ Scanning migrations for unsafe column additions...");

  if (!fs.existsSync(migrationsDir)) {
    console.log("✅ No migrations folder found to scan.");
    process.exit(0);
  }

  const scanMigrationFolder = (dir: string) => {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        scanMigrationFolder(itemPath);
      } else if (stat.isFile() && item === "migration.sql") {
        const content = fs.readFileSync(itemPath, "utf-8");
        const lines = content.split("\n");

        for (const line of lines) {
          // Detect "ADD COLUMN" and "NOT NULL" without "DEFAULT" on the same line.
          const hasAddColumn = line.includes("ADD COLUMN");
          const hasNotNull = line.includes("NOT NULL");
          const hasDefault = /default/i.test(line);

          if (hasAddColumn && hasNotNull && !hasDefault) {
            console.error(
              `❌ Unsafe migration detected in file: ${path.relative(rootDir, itemPath)}`
            );
            console.error(
              `   Adding a non-nullable column without a default value is prohibited on existing tables.`
            );
            console.error(`   Line: ${line.trim()}`);
            process.exit(1);
          }
        }
      }
    }
  };

  scanMigrationFolder(migrationsDir);
  console.log("✅ All migrations passed static safety checks.");
}

main();
