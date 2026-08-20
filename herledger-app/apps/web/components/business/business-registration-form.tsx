"use client";

import { useEffect, useRef } from "react";
import { WalletConnect } from "@/components/wallet/wallet-connect";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ErrorMessage } from "@/components/ui/error-message";
import { StatusBadge } from "@/components/ui/status-badge";
import { useRegistrationFlow, type RegistrationStep } from "@/hooks/use-registration-flow";

// ---------------------------------------------------------------------------
// Business registration onboarding form
// Follows the spec onboarding flow:
// 1. Connect wallet → 2. Enter business name → 3. Submit on-chain registration
//
// State machine lives in `useRegistrationFlow` (apps/web/hooks) — this
// component is purely presentational plus focus/ARIA wiring for the wizard.
// ---------------------------------------------------------------------------

const WIZARD_STEPS: { key: "wallet" | "details" | "confirmed"; label: string }[] = [
  { key: "wallet", label: "Connect wallet" },
  { key: "details", label: "Business details" },
  { key: "confirmed", label: "Confirmation" },
];

/** Collapses the 5 internal steps down to the 3 steps shown in the indicator. */
function indicatorKeyFor(step: RegistrationStep): "wallet" | "details" | "confirmed" {
  if (step === "wallet") return "wallet";
  if (step === "confirmed") return "confirmed";
  return "details"; // details, submitting, error all read as "on step 2"
}

function StepIndicator({ step }: { step: RegistrationStep }) {
  const activeKey = indicatorKeyFor(step);
  return (
    <ol
      aria-label="Registration steps"
      style={{
        display: "flex",
        gap: "1.25rem",
        listStyle: "none",
        padding: 0,
        margin: "0 0 1.5rem 0",
      }}
    >
      {WIZARD_STEPS.map((s) => {
        const isActive = s.key === activeKey;
        return (
          <li
            key={s.key}
            aria-current={isActive ? "step" : undefined}
            style={{
              fontSize: "0.8125rem",
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "var(--foreground)" : "var(--muted)",
            }}
          >
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}

// Adapted from a parallel accessibility pass that landed on main against the
// pre-hook version of this component (see PR history / merge conflict on
// #56) — kept as a genuine improvement (a redundant sr-only live-region
// announcement alongside focus management helps users on screen readers
// that don't reliably announce focus moves to headings) but rewired against
// RegistrationStep, since the original assumed the component's own local
// `Step` type and useState setters that useRegistrationFlow replaced.
function getStepAnnouncement(step: RegistrationStep): string {
  switch (step) {
    case "wallet":
      return "Step 1 of 2: Connect your Stellar wallet";
    case "details":
      return "Step 2 of 2: Business details";
    case "confirmed":
      return "Business registered on Stellar";
    case "error":
      return "There was a problem with your registration";
    case "submitting":
      // The submitting view has its own dedicated aria-live paragraph;
      // announcing here too would read the same content twice.
      return "";
  }
}

export function BusinessRegistrationForm() {
  const {
    step,
    walletAddress,
    businessName,
    error,
    txHash,
    connectWallet,
    setBusinessName,
    submit,
    retry,
  } = useRegistrationFlow();

  // Focus management: move focus to the current step's heading on every
  // forward (and retry) transition, so screen reader / keyboard users land
  // somewhere meaningful instead of at the top of the page. Skipped on the
  // very first render so mounting the form doesn't yank focus away from
  // wherever the user already was (e.g. having just followed a link here).
  const walletHeadingRef = useRef<HTMLHeadingElement>(null);
  const detailsHeadingRef = useRef<HTMLHeadingElement>(null);
  const submittingHeadingRef = useRef<HTMLHeadingElement>(null);
  const confirmedHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorHeadingRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const refByStep: Record<RegistrationStep, React.RefObject<HTMLHeadingElement | null>> = {
      wallet: walletHeadingRef,
      details: detailsHeadingRef,
      submitting: submittingHeadingRef,
      confirmed: confirmedHeadingRef,
      error: errorHeadingRef,
    };
    refByStep[step]?.current?.focus();
  }, [step]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submit();
  }

  let content: React.ReactNode;

  if (step === "confirmed") {
    content = (
      <div>
        <StepIndicator step={step} />
        <div style={{ marginBottom: "1rem" }}>
          <StatusBadge status="Verified" />
        </div>
        <h3 ref={confirmedHeadingRef} tabIndex={-1} style={{ fontWeight: 500, marginBottom: "0.5rem" }}>
          Business registered on Stellar
        </h3>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
          Your registration has been confirmed on the Stellar network.
        </p>
        {txHash && (
          <p style={{ fontFamily: "monospace", fontSize: "0.8125rem", wordBreak: "break-all" }}>
            Transaction: {txHash}
          </p>
        )}
      </div>
    );
  } else if (step === "submitting") {
    content = (
      <div>
        <StepIndicator step={step} />
        <h3 ref={submittingHeadingRef} tabIndex={-1} style={{ fontSize: "0.9375rem", fontWeight: 500 }}>
          Submitting registration
        </h3>
        <p aria-live="polite" style={{ color: "var(--muted)" }}>
          Submitting your registration to Stellar… This may take a few seconds.
        </p>
      </div>
    );
  } else {
    content = (
      <div>
        <StepIndicator step={step} />

        {step === "wallet" || step === "details" ? (
          <>
            <div style={{ marginBottom: "1.5rem" }}>
              <h3
                ref={walletHeadingRef}
                tabIndex={-1}
                style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "0.75rem" }}
              >
                Step 1: Connect your Stellar wallet
              </h3>
              <WalletConnect onConnected={connectWallet} />
            </div>

            {step === "details" && walletAddress && (
              <form onSubmit={handleSubmit}>
                <h3
                  ref={detailsHeadingRef}
                  tabIndex={-1}
                  style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "0.75rem" }}
                >
                  Step 2: Business details
                </h3>
                {error && <ErrorMessage message={error} />}
                <FormField
                  id="businessName"
                  label="Business name"
                  type="text"
                  value={businessName}
                  onChange={setBusinessName}
                  required
                />
                <SubmitButton loading={false}>Register on Stellar</SubmitButton>
              </form>
            )}
          </>
        ) : null}

        {step === "error" && (
          <div>
            <h3
              ref={errorHeadingRef}
              tabIndex={-1}
              style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "0.75rem" }}
            >
              Registration failed
            </h3>
            {error && <ErrorMessage message={error} />}
            <button
              type="button"
              onClick={retry}
              style={{
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "0.5rem 1rem",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div role="status" aria-live="polite" className="sr-only">
        {getStepAnnouncement(step)}
      </div>
      {content}
    </div>
  );
}