#!/usr/bin/env node
/**
 * CSS bundle budget check (issue #20).
 *
 * After `next build`, Tailwind's purged, minified CSS is emitted as static
 * chunks under `.next/static/css/*.css`. This script gzips each chunk (the
 * over-the-wire size browsers actually transfer) and fails the build if the
 * total exceeds a configurable budget.
 *
 * Why a raw-file-size check instead of webpack-bundle-analyzer: this repo's
 * CI already runs a plain `next build`; analyzer output is an interactive
 * HTML report meant for a human to click through, not something a CI job
 * can assert a pass/fail threshold against without extra plumbing (stats
 * JSON parsing, a headless report parser, etc.). Reading the already-built
 * `.next/static/css` output and gzipping it with Node's built-in `zlib` is
 * a handful of lines, has zero new dependencies, and directly measures the
 * one thing this check cares about: what ships to the browser. If deeper
 * per-module attribution is ever needed (e.g. "which import dragged in
 * 20KB"), `@next/bundle-analyzer` is the right upgrade path then.
 *
 * Usage: node scripts/check-css-bundle-size.mjs [--budget-kb=50]
 * Env:   CSS_BUDGET_KB overrides the default budget (gzipped, per build).
 */
import { gzipSync } from "node:zlib";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_BUDGET_KB = 50;

function parseBudgetKb() {
  const flag = process.argv.find((arg) => arg.startsWith("--budget-kb="));
  if (flag) {
    const value = Number(flag.split("=")[1]);
    if (!Number.isNaN(value) && value > 0) return value;
  }
  const envValue = Number(process.env.CSS_BUDGET_KB);
  if (!Number.isNaN(envValue) && envValue > 0) return envValue;
  return DEFAULT_BUDGET_KB;
}

function findCssFiles(dir) {
  if (!existsSync(dir)) return [];
  const results = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      results.push(...findCssFiles(fullPath));
    } else if (entry.endsWith(".css")) {
      results.push(fullPath);
    }
  }
  return results;
}

function main() {
  const budgetKb = parseBudgetKb();
  const cssDir = join(process.cwd(), ".next", "static", "css");
  const cssFiles = findCssFiles(cssDir);

  if (cssFiles.length === 0) {
    console.error(
      `[css-budget] No CSS files found under ${cssDir}. Run "next build" first, ` +
        `or the build output location has changed and this script needs updating.`
    );
    process.exit(1);
  }

  let totalGzipBytes = 0;
  const rows = cssFiles.map((file) => {
    const raw = readFileSync(file);
    const gzipBytes = gzipSync(raw).length;
    totalGzipBytes += gzipBytes;
    return { file: file.replace(process.cwd(), "."), rawBytes: raw.length, gzipBytes };
  });

  const totalKb = totalGzipBytes / 1024;

  console.log("[css-budget] CSS bundle sizes (gzipped):");
  for (const row of rows) {
    console.log(
      `  ${row.file} — ${(row.gzipBytes / 1024).toFixed(2)} KB gzip (${(row.rawBytes / 1024).toFixed(2)} KB raw)`
    );
  }
  console.log(
    `[css-budget] Total: ${totalKb.toFixed(2)} KB gzip across ${cssFiles.length} file(s). Budget: ${budgetKb} KB.`
  );

  if (totalKb > budgetKb) {
    console.error(
      `[css-budget] FAIL: total gzipped CSS (${totalKb.toFixed(2)} KB) exceeds the ${budgetKb} KB budget. ` +
        `Check the Tailwind "content" glob in tailwind config and recent global CSS changes for unintended bloat.`
    );
    process.exit(1);
  }

  console.log("[css-budget] OK");
}

main();
