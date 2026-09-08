import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildIndexerOpenApiSpec } from "../indexer/src/api/openapi.js";
import { buildWebOpenApiSpec } from "../apps/web/lib/api/openapi.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

export function generateOpenApiSpecs() {
  const indexerSpec = buildIndexerOpenApiSpec();
  const webSpec = buildWebOpenApiSpec();

  const indexerPath = path.join(rootDir, "indexer", "openapi.json");
  const webPath = path.join(rootDir, "apps", "web", "public", "openapi.json");

  fs.writeFileSync(indexerPath, JSON.stringify(indexerSpec, null, 2) + "\n", "utf8");
  fs.writeFileSync(webPath, JSON.stringify(webSpec, null, 2) + "\n", "utf8");

  console.log(`Generated OpenAPI spec for Indexer at: ${indexerPath}`);
  console.log(`Generated OpenAPI spec for Web at: ${webPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateOpenApiSpecs();
}
