/**
 * Must match `emailAndPassword.minPasswordLength` in lib/auth/server.ts --
 * kept here as the single source both the client-side check in
 * sign-up-form.tsx and the strength meter's copy read from, so the two
 * can't drift out of sync with each other (they can still drift from the
 * server value, which isn't importable from client code; the server
 * itself is the actual enforcement point either way).
 */
export const MIN_PASSWORD_LENGTH = 12;
