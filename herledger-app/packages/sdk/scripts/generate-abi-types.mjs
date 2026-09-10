#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Generates the *.abi.ts files under src/contracts/__generated__/ from the
// on-chain interface (SCSpec) of each built HerLedger contract, via
// `stellar contract inspect`.
//
// Usage (from packages/sdk):
//   node scripts/generate-abi-types.mjs
//   node scripts/generate-abi-types.mjs --check   # exit 1 on diff, no write (used by CI)
//
// Requires:
//   - Stellar CLI on PATH (`stellar contract build` must have already been
//     run in herledger-contract/, producing target/wasm32v1-none/release/*.wasm)
// ---------------------------------------------------------------------------

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { xdr } from "@stellar/stellar-sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SDK_ROOT = resolve(__dirname, "..");
const MONOREPO_ROOT = resolve(SDK_ROOT, "../../..");
const CONTRACT_ROOT = join(MONOREPO_ROOT, "herledger-contract");
const WASM_DIR = join(CONTRACT_ROOT, "target", "wasm32v1-none", "release");
const OUT_DIR = join(SDK_ROOT, "src", "contracts", "__generated__");

const CHECK_MODE = process.argv.includes("--check");

/** contract crate name -> { wasmFile, tsFile, abiName, structName } */
const CONTRACTS = [
  {
    crate: "business_registry",
    wasm: "business_registry.wasm",
    outFile: "business-registry.abi.ts",
    abiName: "BusinessRegistryAbi",
    methodsConstName: "BUSINESS_REGISTRY_METHODS",
    header: "BusinessRegistry",
  },
  {
    crate: "financial_ledger",
    wasm: "financial_ledger.wasm",
    outFile: "financial-ledger.abi.ts",
    abiName: "FinancialLedgerAbi",
    methodsConstName: "FINANCIAL_LEDGER_METHODS",
    header: "FinancialLedger",
  },
  {
    crate: "attestation_registry",
    wasm: "attestation_registry.wasm",
    outFile: "attestation-registry.abi.ts",
    abiName: "AttestationRegistryAbi",
    methodsConstName: "ATTESTATION_REGISTRY_METHODS",
    header: "AttestationRegistry",
  },
];

function typeDefToTs(td) {
  const kind = td.switch().name;
  switch (kind) {
    case "scSpecTypeAddress":
      return "string"; // Address
    case "scSpecTypeBool":
      return "boolean";
    case "scSpecTypeVoid":
      return "void";
    case "scSpecTypeString":
    case "scSpecTypeSymbol":
      return "string";
    case "scSpecTypeU32":
    case "scSpecTypeI32":
      return "number";
    case "scSpecTypeU64":
    case "scSpecTypeI64":
    case "scSpecTypeU128":
    case "scSpecTypeI128":
    case "scSpecTypeU256":
    case "scSpecTypeI256":
      return "bigint";
    case "scSpecTypeBytesN":
      return "string"; // hex-encoded BytesN<N>
    case "scSpecTypeBytes":
      return "string";
    case "scSpecTypeOption":
      return `${typeDefToTs(td.option().valueType())} | null`;
    case "scSpecTypeVec":
      return `${typeDefToTs(td.vec().elementType())}[]`;
    case "scSpecTypeResult":
      // Result<T, E> -> T. Errors surface as thrown ContractError at the RPC layer.
      return typeDefToTs(td.result().okType());
    case "scSpecTypeUdt":
      return td.udt().name().toString();
    default:
      return "unknown";
  }
}

function specEntriesFromWasm(wasmPath) {
  let raw;
  try {
    raw = execFileSync(
      "stellar",
      ["contract", "info", "--wasm", wasmPath, "--output", "xdr-base64-array"],
      { encoding: "utf-8" }
    );
  } catch {
    raw = execFileSync(
      "stellar",
      ["contract", "inspect", "--wasm", wasmPath, "--output", "xdr-base64-array"],
      { encoding: "utf-8" }
    );
  }
  /** @type {string[]} */
  const entriesB64 = JSON.parse(raw);
  return entriesB64.map((b64) => xdr.ScSpecEntry.fromXDR(b64, "base64"));
}

function generateForContract(cfg) {
  const wasmPath = join(WASM_DIR, cfg.wasm);
  if (!existsSync(wasmPath)) {
    throw new Error(
      `Missing built WASM for ${cfg.crate}: ${wasmPath}\n` +
        `Run ./herledger-contract/scripts/build.sh first.`
    );
  }

  const entries = specEntriesFromWasm(wasmPath);

  const functions = entries.filter((e) => e.switch().name === "scSpecEntryFunctionV0");
  const structs = entries.filter((e) => e.switch().name === "scSpecEntryUdtStructV0");
  const unionEnums = entries.filter((e) => e.switch().name === "scSpecEntryUdtUnionV0");

  const structBlocks = structs.map((entry) => {
    const s = entry.udtStructV0();
    const name = s.name().toString();
    const fields = s
      .fields()
      .map((f) => `  ${f.name().toString()}: ${typeDefToTs(f.type())};`)
      .join("\n");
    return `export interface ${name} {\n${fields}\n}`;
  });

  const enumBlocks = unionEnums.map((entry) => {
    const u = entry.udtUnionV0();
    const name = u.name().toString();
    const cases = u
      .cases()
      .map((c) => {
        const switchName = c.switch().name;
        if (switchName === "scSpecUdtUnionCaseVoidV0") {
          return `"${c.voidCase().name().toString()}"`;
        } else if (switchName === "scSpecUdtUnionCaseTupleV0") {
          return `"${c.tupleCase().name().toString()}"`;
        } else if (typeof c.value === "function" && c.value()?.name) {
          return `"${c.value().name().toString()}"`;
        }
        return `"${c.arm()}"`;
      })
      .join(" | ");
    return `export type ${name} = ${cases};`;
  });

  const methodLines = functions.map((entry) => {
    const f = entry.functionV0();
    const fnName = f.name().toString();
    const params = f
      .inputs()
      .map((i) => `${i.name().toString()}: ${typeDefToTs(i.type())}`)
      .join(", ");
    const outputs = f.outputs();
    const returnTs = outputs.length > 0 ? typeDefToTs(outputs[0]) : "void";
    return `  ${fnName}(${params}): ${returnTs};`;
  });

  const methodNames = functions.map((entry) => entry.functionV0().name().toString());

  const body = `// ---------------------------------------------------------------------------
// AUTO-GENERATED — DO NOT EDIT BY HAND.
//
// Generated from \`stellar contract inspect\` output for the ${cfg.header}
// contract (herledger-contract/contracts/${cfg.crate}). Regenerate with:
//
//   pnpm --filter @herledger/sdk generate:abi
//
// CI re-runs this generation and fails the build if this file's contents
// differ from what's committed — see .github/workflows/ci.yml (job: abi-check).
// ---------------------------------------------------------------------------

${[...enumBlocks, ...structBlocks].join("\n\n")}

export interface ${cfg.abiName} {
${methodLines.join("\n")}
}

/** Function names, used by the CI diff check to flag added/removed/renamed methods. */
export const ${cfg.methodsConstName} = [
  ${methodNames.map((m) => `"${m}"`).join(",\n  ")},
] as const;
`;

  return { body, methodNames };
}

function main() {
  const results = [];
  for (const cfg of CONTRACTS) {
    const outPath = join(OUT_DIR, cfg.outFile);
    const { body: generated, methodNames: wasmMethods } = generateForContract(cfg);

    if (CHECK_MODE) {
      const existing = existsSync(outPath) ? readFileSync(outPath, "utf-8") : "";
      const match = existing.match(
        new RegExp(`export const ${cfg.methodsConstName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as const;`)
      );
      const committedMethods = match
        ? match[1]
            .split(",")
            .map((m) => m.replace(/["'\s]/g, ""))
            .filter(Boolean)
        : [];

      const missingInCommitted = wasmMethods.filter((m) => !committedMethods.includes(m));
      const removedInWasm = committedMethods.filter((m) => !wasmMethods.includes(m));

      if (missingInCommitted.length > 0 || removedInWasm.length > 0 || !existing) {
        results.push({
          cfg,
          outPath,
          drift: true,
          details: { missingInCommitted, removedInWasm },
        });
      } else {
        results.push({ cfg, outPath, drift: false });
      }
    } else {
      writeFileSync(outPath, generated, "utf-8");
      results.push({ cfg, outPath, drift: false });
    }
  }

  const drifted = results.filter((r) => r.drift);
  if (CHECK_MODE && drifted.length > 0) {
    console.error(
      `\nABI drift detected for: ${drifted.map((d) => d.cfg.header).join(", ")}\n` +
        `The deployed contract interface no longer matches the committed generated ` +
        `types. Run \`pnpm --filter @herledger/sdk generate:abi\` locally, review the ` +
        `diff against the hand-written contract clients, and commit the result.\n`
    );
    for (const d of drifted) {
      if (d.details) {
        console.error(
          `  ${d.cfg.header}: missing in committed: [${d.details.missingInCommitted.join(", ")}], removed in wasm: [${d.details.removedInWasm.join(", ")}]`
        );
      }
    }
    process.exit(1);
  }

  console.log(
    CHECK_MODE
      ? "ABI types are up to date."
      : `Generated ${results.length} ABI file(s) in ${OUT_DIR}`
  );
}

main();
