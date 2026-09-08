import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CreateAttestationForm } from "@/components/attestations/create-attestation-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("createAttestation") };
}

export default async function CreateAttestationPage() {
  const t = await getTranslations("dashboard");

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        {t("createAttestation")}
      </h1>
      <CreateAttestationForm />
    </div>
  );
}
