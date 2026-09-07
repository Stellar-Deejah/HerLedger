import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AttesterRegistrationForm } from "@/components/attestations/attester-registration-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("registerAttester") };
}

export default async function RegisterAttesterPage() {
  const t = await getTranslations("dashboard");

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        {t("registerAttester")}
      </h1>
      <AttesterRegistrationForm />
    </div>
  );
}
