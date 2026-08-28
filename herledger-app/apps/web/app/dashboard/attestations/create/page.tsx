import type { Metadata } from "next";

import { CreateAttestationForm } from "@/components/attestations/create-attestation-form";

export const metadata: Metadata = { title: "Create Attestation" };

export default function CreateAttestationPage() {
  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Create attestation
      </h1>
      <CreateAttestationForm />
    </div>
  );
}
