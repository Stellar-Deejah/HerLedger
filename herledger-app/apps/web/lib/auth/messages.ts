/**
 * Every credential-failure path in Better Auth's signInEmail (unknown
 * email, no credential account on the user, wrong password) already
 * normalizes to this exact string server-side — see
 * BASE_ERROR_CODES.INVALID_EMAIL_OR_PASSWORD in
 * @better-auth/core/dist/error/codes.mjs (installed at better-auth@1.6.28)
 * — and that path even does a dummy password hash on the "not found" case
 * so response timing doesn't leak which case it was.
 */
export const GENERIC_SIGN_IN_ERROR = "Invalid email or password";

/**
 * Shown for a sign-in attempt against an unverified account. Distinct from
 * the generic credential-failure message on purpose: reaching this path
 * already proves the caller knows a valid email/password pair (Better
 * Auth's own EMAIL_NOT_VERIFIED check runs after credential verification,
 * not before it — confirmed against the real auth.handler() response), so
 * naming the actual reason here doesn't leak anything an attacker without
 * valid credentials could use for user enumeration.
 */
export const EMAIL_NOT_VERIFIED_ERROR =
  "Please verify your email before signing in. Check your inbox for a verification link.";

/**
 * Normalizes a sign-in failure to one of two messages: EMAIL_NOT_VERIFIED_ERROR
 * for the one case above, or the single generic GENERIC_SIGN_IN_ERROR for
 * everything else, regardless of the underlying Better Auth error code. The
 * generic fallback is a defensive second layer on top of Better Auth's own
 * (already-generic) server-side message: it stops the client from ever
 * surfacing a *different*, more specific message verbatim — e.g. from a
 * future plugin, a misconfiguration, or an upstream change — that could
 * distinguish "no such user" from "wrong password" and enable user
 * enumeration.
 */
export function normalizeSignInError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;

  if (code === "EMAIL_NOT_VERIFIED") {
    return EMAIL_NOT_VERIFIED_ERROR;
  }

  return GENERIC_SIGN_IN_ERROR;
}
