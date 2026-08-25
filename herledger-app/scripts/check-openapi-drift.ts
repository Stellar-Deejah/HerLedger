import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildIndexerOpenApiSpec } from "../indexer/src/api/openapi.js";
import { buildWebOpenApiSpec } from "../apps/web/lib/api/openapi.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

export function checkOpenApiDrift(): boolean {
  const indexerSpec = buildIndexerOpenApiSpec();
  const webSpec = buildWebOpenApiSpec();

  const indexerPath = path.join(rootDir, "indexer", "openapi.json");
  const webPath = path.join(rootDir, "apps", "web", "public", "openapi.json");

  if (!fs.existsSync(indexerPath)) {
    console.error(`Error: ${indexerPath} does not exist. Run 'pnpm openapi:generate'.`);
    return false;
  }

  if (!fs.existsSync(webPath)) {
    console.error(`Error: ${webPath} does not exist. Run 'pnpm openapi:generate'.`);
    return false;
  }

  const existingIndexerJson = fs.readFileSync(indexerPath, "utf8");
  const existingWebJson = fs.readFileSync(webPath, "utf8");

  const generatedIndexerJson = JSON.stringify(indexerSpec, null, 2) + "\n";
  const generatedWebJson = JSON.stringify(webSpec, null, 2) + "\n";

  let hasDrift = false;

  if (existingIndexerJson !== generatedIndexerJson) {
    console.error(`Spec drift detected in Indexer API (${indexerPath})!`);
    hasDrift = true;
  }

  if (existingWebJson !== generatedWebJson) {
    console.error(`Spec drift detected in Web API (${webPath})!`);
    hasDrift = true;
  }

  if (hasDrift) {
    console.error(
      "\nOpenAPI spec drift check failed! Please run 'pnpm openapi:generate' to update committed spec files."
    );
    return false;
  }

  console.log("OpenAPI specs are up-to-date. No spec drift detected.");
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ok = checkOpenApiDrift();
  if (!ok) {
    process.exit(1);
  }
}
