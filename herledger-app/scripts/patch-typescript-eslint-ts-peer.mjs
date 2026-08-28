#!/usr/bin/env node
// typescript-eslint's parser/plugin/meta-package hard-error at import time
// against TypeScript >=7 (they check `ts.versionMajorMinor` and throw):
// https://github.com/typescript-eslint/typescript-eslint/issues/10940
// TypeDoc (typedoc@0.28.x) likewise crashes against TS 7 because its peer
// range is `5.0.x || … || 6.0.x` (it reads `ts.SyntaxKind` at import time).
//
// This repo pins the real `typescript` package to 7.x everywhere (for tsc
// and for TS7-specific strictness), so the peer that pnpm would normally
// hoist into every @typescript-eslint/* / typedoc package is the one that
// crashes them. The typescript-eslint team's own suggested workaround is to
// run their toolchain "side by side" against a TS 6-line compiler. `pnpm
// overrides` doesn't reach into these nested peer slots reliably, so this
// script does it directly after every install: it repoints the private
// `node_modules/typescript` symlink inside each @typescript-eslint/* /
// typedoc package (in pnpm's content-addressable store) at the pinned
// `typescript-eslint-ts6-compat` package (real `typescript@5.9.3`,
// installed under an alias so it doesn't collide with the repo's TS 7).
//
// Safe to re-run: it's a no-op once the symlinks already point at the
// compat package. Remove this once typescript-eslint / TypeDoc ship TS7
// support.
import { existsSync, lstatSync, readlinkSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = dirname(fileURLToPath(import.meta.url)) + "/..";
const pnpmStore = join(repoRoot, "node_modules/.pnpm");

if (!existsSync(pnpmStore)) {
  process.exit(0);
}

const compatTypescriptDir = dirname(
  require.resolve("typescript-eslint-ts6-compat/package.json", {
    paths: [repoRoot],
  }),
);

const targetPackagePrefixes = [
  "typescript-eslint@",
  "@typescript-eslint+parser@",
  "@typescript-eslint+eslint-plugin@",
  "@typescript-eslint+typescript-estree@",
  "@typescript-eslint+utils@",
  "@typescript-eslint+type-utils@",
  "@typescript-eslint+project-service@",
  "@typescript-eslint+tsconfig-utils@",
  "ts-api-utils@",
  "typedoc@",
];

let patched = 0;
for (const entry of readdirSync(pnpmStore)) {
  if (!targetPackagePrefixes.some((prefix) => entry.startsWith(prefix))) {
    continue;
  }

  const typescriptLink = join(pnpmStore, entry, "node_modules", "typescript");
  if (!existsSync(join(pnpmStore, entry, "node_modules"))) {
    continue;
  }

  const desiredTarget = relative(
    join(pnpmStore, entry, "node_modules"),
    compatTypescriptDir,
  );

  if (existsSync(typescriptLink) || lstatSyncSafe(typescriptLink)) {
    const current = lstatSyncSafe(typescriptLink);
    if (current?.isSymbolicLink() && readlinkSync(typescriptLink) === desiredTarget) {
      continue;
    }
    rmSync(typescriptLink, { recursive: true, force: true });
  }

  const symlinkType = process.platform === "win32" ? "junction" : "dir";
  symlinkSync(desiredTarget, typescriptLink, symlinkType);
  patched += 1;
}

function lstatSyncSafe(path) {
  try {
    return lstatSync(path);
  } catch {
    return null;
  }
}

if (patched > 0) {
  console.log(
    `patch-typescript-eslint-ts-peer: repointed ${patched} typescript-eslint package(s) to typescript@5.9.3`,
  );
}
