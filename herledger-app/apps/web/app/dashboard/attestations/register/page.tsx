import type { Metadata } from "next";

import { AttesterRegistrationForm } from "@/components/attestations/attester-registration-form";

export const metadata: Metadata = { title: "Register Attester" };

export default function RegisterAttesterPage() {
  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Register attester
      </h1>
      <AttesterRegistrationForm />
    </div>
  );
}
