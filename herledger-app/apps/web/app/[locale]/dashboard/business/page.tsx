import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BusinessProfile } from "@/components/business/business-profile";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("business") };
}

export default async function BusinessPage() {
  const t = await getTranslations("dashboard");

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        {t("business")}
      </h1>
      <BusinessProfile />
    </div>
  );
}
