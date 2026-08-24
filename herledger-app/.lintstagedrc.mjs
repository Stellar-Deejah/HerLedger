// lint-staged config for the monorepo.
//
// Each entry is scoped to one workspace package. `eslint --fix` runs only
// against the staged files that matched (lint-staged passes them as
// absolute paths, so each package's nearest eslint.config.mjs is picked up
// correctly regardless of cwd). `tsc --noEmit` can't meaningfully check a
// single file in isolation -- TypeScript needs the whole program -- so each
// typecheck task ignores the filenames it's given and runs the package's
// full `pnpm --filter <pkg> typecheck` instead; it still only fires when a
// staged file actually falls under that package.
export default {
  "apps/web/**/*.{ts,tsx}": (files) => [
    `eslint --fix ${files.map((f) => `"${f}"`).join(" ")}`,
    "pnpm --filter web typecheck",
  ],
  "indexer/**/*.ts": (files) => [
    `eslint --fix ${files.map((f) => `"${f}"`).join(" ")}`,
    "pnpm --filter indexer typecheck",
  ],
  "packages/config/**/*.ts": (files) => [
    `eslint --fix ${files.map((f) => `"${f}"`).join(" ")}`,
    "pnpm --filter @herledger/config typecheck",
  ],
  "packages/sdk/**/*.ts": (files) => [
    `eslint --fix ${files.map((f) => `"${f}"`).join(" ")}`,
    "pnpm --filter @herledger/sdk typecheck",
  ],
};
