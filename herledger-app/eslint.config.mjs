import tseslint from "typescript-eslint";

// ---------------------------------------------------------------------------
// Shared ESLint config for the plain Node/TS backend packages (indexer,
// packages/*). `apps/web` has its own `eslint.config.mjs` with Next.js- and
// React-specific rules on top of this same baseline — ESLint's flat config
// resolution walks up from a package's cwd to the nearest ancestor config,
// so apps/web's own file takes precedence there and this one is never
// consulted for it.
// ---------------------------------------------------------------------------

export default [
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/generated/**"],
  },
];
