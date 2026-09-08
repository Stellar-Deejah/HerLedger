import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DisputeList } from "@/components/disputes/dispute-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("disputes") };
}

export default async function DisputesPage() {
  const t = await getTranslations("dashboard");

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        {t("disputes")}
      </h1>
      <DisputeList />
    </div>
  );
}
