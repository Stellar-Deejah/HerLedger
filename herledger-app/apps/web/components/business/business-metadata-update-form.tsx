"use client";

import { useState } from "react";
import { z } from "zod";

const metadataHashSchema = z
  .string()
  .regex(/^[0-9a-f]{64}$/i, "Metadata hash must be a 64-character hexadecimal string (SHA-256)");

interface BusinessMetadataUpdateFormProps {
  businessId: string;
  currentMetadataHash: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BusinessMetadataUpdateForm({
  businessId,
  currentMetadataHash,
  onSuccess,
  onCancel,
}: BusinessMetadataUpdateFormProps) {
  const [metadataHash, setMetadataHash] = useState(currentMetadataHash);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateHash = (hash: string): boolean => {
    const result = metadataHashSchema.safeParse(hash);
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? "Invalid metadata hash");
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateHash(metadataHash)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/business/metadata", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          metadataHash,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update metadata");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update metadata");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "1.5rem",
        marginBottom: "1.5rem",
      }}
    >
      <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
        Update Business Metadata
      </h3>
      <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        Update your business metadata hash on-chain. This will update the metadata hash stored in
        the smart contract. The metadata hash should be a SHA-256 hash of your business metadata
        JSON.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label
            htmlFor="metadataHash"
            style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: 500,
              marginBottom: "0.5rem",
            }}
          >
            Metadata Hash (SHA-256)
          </label>
          <input
            id="metadataHash"
            type="text"
            value={metadataHash}
            onChange={(e) => {
              setMetadataHash(e.target.value);
              validateHash(e.target.value);
            }}
            placeholder="e.g., a1b2c3d4e5f6..."
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontFamily: "monospace",
              fontSize: "0.875rem",
            }}
          />
          {validationError && (
            <p
              style={{ color: "var(--error, #ef4444)", fontSize: "0.75rem", marginTop: "0.25rem" }}
            >
              {validationError}
            </p>
          )}
        </div>

        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem",
            backgroundColor: "var(--muted-background, #f5f5f5)",
            borderRadius: "var(--radius)",
          }}
        >
          <p style={{ fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.5rem" }}>
            Current Hash:
          </p>
          <p style={{ fontFamily: "monospace", fontSize: "0.75rem", wordBreak: "break-all" }}>
            {currentMetadataHash}
          </p>
        </div>

        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            borderRadius: "var(--radius)",
          }}
        >
          <p style={{ fontSize: "0.875rem", color: "var(--info, #3b82f6)" }}>
            <strong>Note:</strong> This action requires a Stellar transaction and will incur network
            fees. The metadata hash must be a valid 64-character hexadecimal string (SHA-256
            format).
          </p>
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
            type="button"
            onClick={onCancel}
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
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !!validationError}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              border: "none",
              borderRadius: "var(--radius)",
              backgroundColor: "var(--primary, #3b82f6)",
              color: "white",
              cursor: loading || validationError ? "not-allowed" : "pointer",
              opacity: loading || validationError ? 0.6 : 1,
            }}
          >
            {loading ? "Updating…" : "Update Metadata"}
          </button>
        </div>
      </form>
    </div>
  );
}
