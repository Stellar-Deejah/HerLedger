"use client";

import { createAuthClient } from "better-auth/react";

// ---------------------------------------------------------------------------
// Better Auth browser client
// Safe for use in Client Components.
// ---------------------------------------------------------------------------

export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession, sendVerificationEmail } = authClient;
