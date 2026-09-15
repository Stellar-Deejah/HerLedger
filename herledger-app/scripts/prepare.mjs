// Setup husky only in local development (skip in CI or production builds)
if (!process.env.CI && process.env.NODE_ENV !== "production") {
  try {
    const { execSync } = await import("node:child_process");
    execSync("cd .. && husky herledger-app/.husky", { stdio: "inherit" });
  } catch {
    // Ignore errors if husky or git is not available
  }
}
