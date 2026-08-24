"use client";

import { useState } from "react";

import { useWallet } from "@/components/wallet/wallet-provider";
import { signOut } from "@/lib/auth/client";

// ---------------------------------------------------------------------------
// Atomic sign-out: clears the cached Stellar wallet address in the same
// handler that ends the Better Auth session, so a subsequent login as a
// different user can never surface the previous user's wallet address.
// ---------------------------------------------------------------------------

export function SignOutButton() {
  const { clearWalletState } = useWallet();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    if (pending) return;
    setPending(true);
    try {
      clearWalletState();
      await signOut();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={() => void handleSignOut()}
      disabled={pending}
      style={{
        background: "none",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "0.5rem 0.75rem",
        cursor: pending ? "not-allowed" : "pointer",
        fontSize: "0.875rem",
        color: "var(--muted)",
        textAlign: "left",
        width: "100%",
      }}
      type="button"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
