"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ErrorMessage } from "@/components/ui/error-message";
import { sendVerificationEmail } from "@/lib/auth/client";
import { runExclusive } from "@/lib/utils/submit-guard";

const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyEmailPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const verified = searchParams.get("verified") === "true";

  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const submittingRef = useRef(false);

  // Better Auth's autoSignInAfterVerification means the redirect back here
  // (see the callbackURL passed at sign-up/resend time) already carries a
  // valid session by the time this page loads — nothing left to do but
  // move on to the dashboard.
  useEffect(() => {
    if (verified) {
      router.push("/dashboard");
    }
  }, [verified, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleResend() {
    if (!email) return;
    setError(null);

    await runExclusive(submittingRef, async () => {
      try {
        const result = await sendVerificationEmail({
          email,
          callbackURL: "/auth/verify-email?verified=true",
        });
        if (result.error) {
          setError(result.error.message ?? "Couldn't resend the verification email.");
        } else {
          setSent(true);
          setCooldown(RESEND_COOLDOWN_SECONDS);
        }
      } catch {
        setError("An unexpected error occurred. Please try again.");
      }
    });
  }

  if (verified) {
    return <p style={{ textAlign: "center", color: "var(--muted)" }}>Redirecting…</p>;
  }

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        {email ? (
          <>
            We sent a verification link to <strong>{email}</strong>. Click the link in that email to
            finish setting up your account.
          </>
        ) : (
          "Check your inbox for a verification link to finish setting up your account."
        )}
      </p>

      {error && <ErrorMessage message={error} />}
      {sent && !error && (
        <p
          role="status"
          style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "1rem" }}
        >
          Verification email sent.
        </p>
      )}

      {email && (
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={cooldown > 0}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "0.5rem 1rem",
            cursor: cooldown > 0 ? "not-allowed" : "pointer",
            fontSize: "0.875rem",
          }}
        >
          {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend verification email"}
        </button>
      )}
    </div>
  );
}
