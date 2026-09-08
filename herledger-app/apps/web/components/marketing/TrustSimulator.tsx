"use client";

import { useState } from "react";

interface SimulationScenario {
  id: string;
  name: string;
  amount: string;
  type: string;
  counterparty: string;
  attester: string;
  status: "Verified" | "Attested" | "Pending";
  contractHash: string;
}

const scenarios: SimulationScenario[] = [
  {
    id: "sc-1",
    name: "Supplier Invoice Settlement",
    amount: "2,450.00 USDC",
    type: "PaymentSent",
    counterparty: "Atlas Logistics Ltd.",
    attester: "Stellar Trade Escrow",
    status: "Verified",
    contractHash: "0x8f2d...3a9c7b",
  },
  {
    id: "sc-2",
    name: "Cross-Border Client Payment",
    amount: "5,800.00 XLM",
    type: "PaymentReceived",
    counterparty: "Pan-African Crafts Guild",
    attester: "Accredited Micro-Finance Hub",
    status: "Attested",
    contractHash: "0x4b1e...f82a1d",
  },
  {
    id: "sc-3",
    name: "Equipment Working Capital",
    amount: "1,200.00 EURC",
    type: "InvoiceSettled",
    counterparty: "SolarTech Machinery",
    attester: "Regional Chamber of Commerce",
    status: "Verified",
    contractHash: "0x9c3f...e17b88",
  },
];

export function TrustSimulator() {
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario>(scenarios[0]!);
  const [verified, setVerified] = useState(false);

  const handleVerify = () => {
    setVerified(true);
    setTimeout(() => setVerified(false), 3000);
  };

  return (
    <section
      style={{
        maxWidth: "960px",
        margin: "0 auto 6rem",
        padding: "0 1.5rem",
      }}
    >
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          background: "var(--color-muted-bg)",
          padding: "2.5rem 2rem",
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-brand)",
              marginBottom: "0.5rem",
              display: "block",
            }}
          >
            Interactive Trust Simulator
          </span>
          <h2
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              margin: "0 0 0.5rem",
              color: "var(--foreground)",
            }}
          >
            How transactions are verified on HerLedger
          </h2>
          <p style={{ margin: 0, color: "var(--color-muted-text)", fontSize: "0.9375rem" }}>
            Select a transaction scenario to see how on-chain verification and off-chain privacy
            interact.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          {scenarios.map((sc) => (
            <button
              key={sc.id}
              onClick={() => setSelectedScenario(sc)}
              style={{
                padding: "0.625rem 1.25rem",
                borderRadius: "var(--radius-md)",
                border:
                  selectedScenario.id === sc.id
                    ? "2px solid var(--color-brand)"
                    : "1px solid var(--border)",
                background: selectedScenario.id === sc.id ? "var(--background)" : "transparent",
                color: "var(--foreground)",
                fontWeight: selectedScenario.id === sc.id ? 600 : 500,
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              {sc.name}
            </button>
          ))}
        </div>

        <div
          style={{
            background: "var(--background)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            padding: "1.5rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1.25rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-muted-text)" }}>
              Amount & Asset
            </div>
            <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--foreground)" }}>
              {selectedScenario.amount}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-muted-text)" }}>Event Type</div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--foreground)" }}>
              {selectedScenario.type}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-muted-text)" }}>
              Counterparty (Private)
            </div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 500, color: "var(--foreground)" }}>
              {selectedScenario.counterparty}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-muted-text)" }}>
              Attester Authority
            </div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 500, color: "var(--foreground)" }}>
              {selectedScenario.attester}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-muted-text)" }}>
              On-Chain Hash
            </div>
            <div
              style={{
                fontSize: "0.8125rem",
                fontFamily: "monospace",
                color: "var(--color-muted-text)",
              }}
            >
              {selectedScenario.contractHash}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              onClick={handleVerify}
              style={{
                width: "100%",
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-sm)",
                background: verified ? "var(--color-success)" : "var(--color-brand)",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
            >
              {verified ? "✓ Cryptographically Verified" : "Simulate Proof Check"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
