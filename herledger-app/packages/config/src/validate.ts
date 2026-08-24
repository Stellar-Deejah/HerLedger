import { config } from "dotenv";
import { resolve } from "path";
import { getServerEnv } from "./server.js";

// Load .env.local from the workspace root (herledger-app/.env.local)
config({ path: resolve(process.cwd(), "../../.env.local") });

console.log("[HerLedger] Validating environment variables from .env.local...");

try {
  // getServerEnv automatically parses, logs a table on error, and calls process.exit(1)
  getServerEnv();
  console.log("[HerLedger] ✅ Environment variables are valid.");
} catch (err) {
  // Just in case it throws without process.exit(1)
  console.error(err);
  process.exit(1);
}
