import type { Metadata } from "next";
import { AttestationList } from "@/components/attestations/attestation-list";

export const metadata: Metadata = { title: "Attestations" };

export default function AttestationsPage() {
  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>Attestations</h1>
      <AttestationList />
    </div>
  );
}
