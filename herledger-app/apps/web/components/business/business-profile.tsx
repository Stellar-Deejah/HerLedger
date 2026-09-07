"use client";

import { useState, useEffect, useCallback } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { useSession } from "@/lib/auth/client";
import { truncateAddress } from "@/lib/utils/format";

import { BusinessDeactivationFlow } from "./business-deactivation-flow";
import { BusinessMetadataUpdateForm } from "./business-metadata-update-form";
import { BusinessRegistrationForm } from "./business-registration-form";

interface BusinessData {
  id: string;
  name: string;
  metadataHash: string;
  active: boolean;
  owner: string;
  wallet: string;
}

interface Discrepancy {
  field: string;
  dbValue: string;
  chainValue: string;
}

export function BusinessProfile() {
  const { data: session, isPending } = useSession();
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [showDeactivationFlow, setShowDeactivationFlow] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [showDiscrepancies, setShowDiscrepancies] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBusiness = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/business/current");
      if (!response.ok) {
        if (response.status === 404) {
          setBusiness(null);
          return;
        }
        throw new Error("Failed to fetch business");
      }
      const data = await response.json();
      setBusiness(data.business);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch business");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  const verifyOnChain = async () => {
    if (!business) return;

    setVerifying(true);
    setDiscrepancies([]);
    setShowDiscrepancies(false);

    try {
      const response = await fetch("/api/business/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to verify on-chain");
      }

      const data = await response.json();

      if (data.discrepancies && data.discrepancies.length > 0) {
        setDiscrepancies(data.discrepancies);
        setShowDiscrepancies(true);
      } else {
        alert("Business data is up to date with on-chain state.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const refreshFromChain = async () => {
    if (!business) return;

    setRefreshing(true);
    try {
      const response = await fetch("/api/business/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync from chain");
      }

      await fetchBusiness();
      setShowDiscrepancies(false);
      setDiscrepancies([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setRefreshing(false);
    }
  };

  const handleMetadataUpdated = () => {
    setShowMetadataForm(false);
    fetchBusiness();
  };

  const handleDeactivationComplete = () => {
    setShowDeactivationFlow(false);
    fetchBusiness();
  };

  if (isPending || loading) {
    return <p style={{ color: "var(--muted)" }}>Loading…</p>;
  }

  if (!session) {
    return <EmptyState title="Not signed in" />;
  }

  if (error && !business) {
    return (
      <div style={{ color: "var(--error, #ef4444)" }}>
        <p>{error}</p>
        <button onClick={fetchBusiness} style={{ marginTop: "0.5rem" }}>
          Retry
        </button>
      </div>
    );
  }

  if (!business) {
    return (
      <div>
        <section
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
            Register your business
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9375rem", marginBottom: "1.5rem" }}>
            Connect your Stellar wallet and register your business on HerLedger. Your business ID
            and registration will be confirmed on the Stellar network.
          </p>
          <BusinessRegistrationForm />
        </section>
      </div>
    );
  }

  return (
    <div>
      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Business Profile</h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={verifyOnChain}
              disabled={verifying}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                backgroundColor: "var(--background)",
                cursor: verifying ? "not-allowed" : "pointer",
                opacity: verifying ? 0.6 : 1,
              }}
            >
              {verifying ? "Verifying…" : "Verify on-chain"}
            </button>
            <button
              onClick={() => setShowMetadataForm(true)}
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
              Update Metadata
            </button>
            <button
              onClick={() => setShowDeactivationFlow(true)}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                border: "1px solid var(--color-error-text)",
                borderRadius: "var(--radius)",
                backgroundColor: "transparent",
                color: "var(--color-error-text)",
                cursor: "pointer",
              }}
            >
              Deactivate Business
            </button>
          </div>
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

        <div style={{ display: "grid", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--muted)" }}>
              Business ID
            </label>
            <p style={{ marginTop: "0.25rem", fontFamily: "monospace" }}>{business.id}</p>
          </div>
          <div>
            <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--muted)" }}>
              Business Name
            </label>
            <p style={{ marginTop: "0.25rem" }}>{business.name}</p>
          </div>
          <div>
            <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--muted)" }}>
              Owner
            </label>
            <p
              style={{ marginTop: "0.25rem", fontFamily: "monospace", fontSize: "0.875rem" }}
              title={business.owner}
              aria-label={business.owner}
            >
              {truncateAddress(business.owner)}
            </p>
          </div>
          <div>
            <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--muted)" }}>
              Wallet
            </label>
            <p
              style={{ marginTop: "0.25rem", fontFamily: "monospace", fontSize: "0.875rem" }}
              title={business.wallet}
              aria-label={business.wallet}
            >
              {truncateAddress(business.wallet)}
            </p>
          </div>
          <div>
            <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--muted)" }}>
              Status
            </label>
            <p
              style={{
                marginTop: "0.25rem",
                color: business.active ? "var(--color-success-text)" : "var(--color-error-text)",
              }}
            >
              {business.active ? "Active" : "Inactive"}
            </p>
          </div>
          <div>
            <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--muted)" }}>
              Metadata Hash
            </label>
            <p style={{ marginTop: "0.25rem", fontFamily: "monospace", fontSize: "0.875rem" }}>
              {business.metadataHash}
            </p>
          </div>
        </div>
      </section>

      {showDiscrepancies && discrepancies.length > 0 && (
        <section
          style={{
            border: "1px solid rgba(234, 179, 8, 0.3)",
            borderRadius: "var(--radius)",
            padding: "1.5rem",
            marginBottom: "1.5rem",
            backgroundColor: "rgba(234, 179, 8, 0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--warning, #eab308)" }}>
              On-chain Discrepancies Detected
            </h3>
            <button
              onClick={refreshFromChain}
              disabled={refreshing}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                border: "1px solid var(--warning, #eab308)",
                borderRadius: "var(--radius)",
                backgroundColor: "var(--warning, #eab308)",
                color: "var(--background)",
                cursor: refreshing ? "not-allowed" : "pointer",
                opacity: refreshing ? 0.6 : 1,
              }}
            >
              {refreshing ? "Refreshing…" : "Refresh from chain"}
            </button>
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
            The following fields differ between the database and on-chain state:
          </p>
          <table style={{ width: "100%", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Field</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Database</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>On-chain</th>
              </tr>
            </thead>
            <tbody>
              {discrepancies.map((disc, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.5rem", fontWeight: 500 }}>{disc.field}</td>
                  <td style={{ padding: "0.5rem", fontFamily: "monospace" }} title={disc.dbValue}>
                    {truncateAddress(disc.dbValue)}
                  </td>
                  <td
                    style={{ padding: "0.5rem", fontFamily: "monospace" }}
                    title={disc.chainValue}
                  >
                    {truncateAddress(disc.chainValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {showMetadataForm && (
        <BusinessMetadataUpdateForm
          businessId={business.id}
          currentMetadataHash={business.metadataHash}
          onSuccess={handleMetadataUpdated}
          onCancel={() => setShowMetadataForm(false)}
        />
      )}

      {showDeactivationFlow && (
        <BusinessDeactivationFlow
          businessId={business.id}
          businessName={business.name}
          onComplete={handleDeactivationComplete}
          onCancel={() => setShowDeactivationFlow(false)}
        />
      )}
    </div>
  );
}
