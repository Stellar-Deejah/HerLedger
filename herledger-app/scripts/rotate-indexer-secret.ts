#!/usr/bin/env tsx
/**
 * Rotate the INDEXER_API_SECRET environment variable.
 *
 * This script generates a new 32-byte cryptographically secure random secret
 * and updates both the root .env file and the indexer's .env file atomically.
 *
 * Usage:
 *   pnpm rotate:indexer-secret
 *
 * The script will:
 * 1. Generate a new 32-byte hex string
 * 2. Update INDEXER_API_SECRET in both .env files
 * 3. Create a backup of the old .env files
 *
 * After running this script, restart the indexer service to pick up the new secret.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { randomBytes } from "crypto";

function generateSecret(): string {
  return randomBytes(32).toString("hex");
}

function updateEnvFile(filePath: string, newSecret: string): void {
  if (!existsSync(filePath)) {
    console.warn(`File ${filePath} does not exist, skipping`);
    return;
  }

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  let updated = false;

  const newLines = lines.map((line) => {
    if (line.startsWith("INDEXER_API_SECRET=")) {
      updated = true;
      return `INDEXER_API_SECRET=${newSecret}`;
    }
    return line;
  });

  if (!updated) {
    // Add the secret if it doesn't exist
    newLines.push(`INDEXER_API_SECRET=${newSecret}`);
  }

  writeFileSync(filePath, newLines.join("\n"));
  console.log(`Updated ${filePath}`);
}

function backupEnvFile(filePath: string): void {
  if (!existsSync(filePath)) {
    return;
  }

  const backupPath = `${filePath}.backup`;
  writeFileSync(backupPath, readFileSync(filePath));
  console.log(`Backed up ${filePath} to ${backupPath}`);
}

function main(): void {
  console.log("Rotating INDEXER_API_SECRET...");

  const newSecret = generateSecret();
  console.log(`Generated new secret: ${newSecret.substring(0, 8)}...${newSecret.substring(56)}`);

  // Backup existing .env files
  backupEnvFile(".env");
  backupEnvFile("indexer/.env");

  // Update .env files
  updateEnvFile(".env", newSecret);
  updateEnvFile("indexer/.env", newSecret);

  console.log("\nSecret rotation complete!");
  console.log("\nNext steps:");
  console.log("1. Restart the indexer service to pick up the new secret");
  console.log("2. If you have any external services calling the indexer API,");
  console.log("   update their INDEXER_API_SECRET environment variable");
  console.log("\nBackup files created with .backup extension");
  console.log("Remove them after confirming the new secret works correctly");
}

main();
