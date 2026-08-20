import { describe, it, expect } from "vitest";

import { GENERIC_SIGN_IN_ERROR, normalizeSignInError } from "../messages.js";

describe("normalizeSignInError", () => {
  it("returns the same generic message for a 'user not found'-shaped error", () => {
    const userNotFoundError = {
      code: "INVALID_EMAIL_OR_PASSWORD",
      message: "Invalid email or password",
      status: 401,
    };

    expect(normalizeSignInError(userNotFoundError)).toBe(GENERIC_SIGN_IN_ERROR);
  });

  it("returns the same generic message for a 'wrong password'-shaped error", () => {
    // Better Auth's signInEmail throws the exact same code/message for a
    // wrong password as for an unknown email — but this test asserts our
    // own normalization doesn't depend on that being true, since it never
    // reads the error's code or message.
    const wrongPasswordError = {
      code: "INVALID_EMAIL_OR_PASSWORD",
      message: "Invalid email or password",
      status: 401,
    };

    expect(normalizeSignInError(wrongPasswordError)).toBe(GENERIC_SIGN_IN_ERROR);
  });

  it("returns the same generic message even for a hypothetically distinguishing error", () => {
    // If a future Better Auth version, plugin, or misconfiguration ever
    // returns a *different* message for one credential-failure case than
    // another, this normalization must still collapse both to the same
    // string client-side — that's the whole point of the defensive layer.
    const hypotheticalLeakyError = {
      code: "USER_NOT_FOUND",
      message: "No account exists for this email address",
      status: 404,
    };

    expect(normalizeSignInError(hypotheticalLeakyError)).toBe(GENERIC_SIGN_IN_ERROR);
  });

  it("returns the generic message for null/undefined input", () => {
    expect(normalizeSignInError(null)).toBe(GENERIC_SIGN_IN_ERROR);
    expect(normalizeSignInError(undefined)).toBe(GENERIC_SIGN_IN_ERROR);
  });
});
