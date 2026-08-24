"use client";

import { useState } from "react";

interface BusinessDeactivationFlowProps {
  businessId: string;
  businessName: string;
  onComplete: () => void;
  onCancel: () => void;
}

type Step = "warning" | "confirm" | "processing" | "complete";

export function BusinessDeactivationFlow({
  businessId,
  businessName,
  onComplete,
  onCancel,
}: BusinessDeactivationFlowProps) {
  const [step, setStep] = useState<Step>("warning");
  const [confirmationInput, setConfirmationInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmationValid = confirmationInput === businessName;

  const handleConfirm = async () => {
    if (!isConfirmationValid) {
      return;
    }

    setStep("processing");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/business/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to deactivate business");
      }

      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate business");
      setStep("confirm");
    } finally {
      setLoading(false);
    }
  };

  const renderWarningStep = () => (
    <>
      <h3
        style={{
          fontSize: "1.125rem",
          fontWeight: 600,
          marginBottom: "1rem",
          color: "var(--error, #ef4444)",
        }}
      >
        Deactivate Business
      </h3>

      <div
        style={{
          padding: "1rem",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "var(--radius)",
          marginBottom: "1.5rem",
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
          ⚠️ Warning: This action is irreversible
        </p>
        <p style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
          Deactivating your business will have the following consequences:
        </p>
        <ul
          style={{
            fontSize: "0.875rem",
            color: "var(--muted)",
            marginTop: "0.5rem",
            paddingLeft: "1.5rem",
          }}
        >
          <li>Your business will be marked as inactive on the Stellar blockchain</li>
          <li>All financial events associated with this business will become unverifiable</li>
          <li>You will not be able to reactivate this business from the UI</li>
          <li>This action cannot be undone</li>
        </ul>
      </div>

      <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
        To deactivate your business <strong>{businessName}</strong>, you must type the business name
        exactly as shown in the next step.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            backgroundColor: "var(--background)",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => setStep("confirm")}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            border: "none",
            borderRadius: "var(--radius)",
            backgroundColor: "var(--error, #ef4444)",
            color: "white",
            cursor: "pointer",
          }}
        >
          Continue
        </button>
      </div>
    </>
  );

  const renderConfirmStep = () => (
    <>
      <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
        Confirm Deactivation
      </h3>

      <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "1rem" }}>
        Type the business name <strong>{businessName}</strong> to confirm deactivation:
      </p>

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          value={confirmationInput}
          onChange={(e) => setConfirmationInput(e.target.value)}
          placeholder={`Type "${businessName}" to confirm`}
          style={{
            width: "100%",
            padding: "0.5rem",
            border: `1px solid ${confirmationInput && !isConfirmationValid ? "var(--error, #ef4444)" : "var(--border)"}`,
            borderRadius: "var(--radius)",
            fontSize: "0.875rem",
          }}
        />
        {confirmationInput && !isConfirmationValid && (
          <p style={{ color: "var(--error, #ef4444)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
            Business name does not match
          </p>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: "0.75rem",
            marginBottom: "1rem",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "var(--radius)",
            color: "var(--error, #ef4444)",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button
          onClick={() => setStep("warning")}
          disabled={loading}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            backgroundColor: "var(--background)",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading || !isConfirmationValid}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            border: "none",
            borderRadius: "var(--radius)",
            backgroundColor: "var(--error, #ef4444)",
            color: "white",
            cursor: loading || !isConfirmationValid ? "not-allowed" : "pointer",
            opacity: loading || !isConfirmationValid ? 0.6 : 1,
          }}
        >
          {loading ? "Deactivating…" : "Deactivate Business"}
        </button>
      </div>
    </>
  );

  const renderProcessingStep = () => (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <p style={{ fontSize: "1rem", fontWeight: 500 }}>Processing deactivation…</p>
      <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
        Please wait while the transaction is being processed on the Stellar network.
      </p>
    </div>
  );

  const renderCompleteStep = () => (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <p
        style={{
          fontSize: "1.125rem",
          fontWeight: 600,
          color: "var(--success, #22c55e)",
          marginBottom: "1rem",
        }}
      >
        ✓ Business Deactivated
      </p>
      <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        Your business has been successfully deactivated on the Stellar blockchain. All financial
        events are now unverifiable.
      </p>
      <button
        onClick={onComplete}
        style={{
          padding: "0.5rem 1rem",
          fontSize: "0.875rem",
          fontWeight: 500,
          border: "none",
          borderRadius: "var(--radius)",
          backgroundColor: "var(--primary, #3b82f6)",
          color: "white",
          cursor: "pointer",
        }}
      >
        Done
      </button>
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          backgroundColor: "var(--background)",
          borderRadius: "var(--radius)",
          padding: "1.5rem",
          maxWidth: "28rem",
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        {step === "warning" && renderWarningStep()}
        {step === "confirm" && renderConfirmStep()}
        {step === "processing" && renderProcessingStep()}
        {step === "complete" && renderCompleteStep()}
      </div>
    </div>
  );
}
