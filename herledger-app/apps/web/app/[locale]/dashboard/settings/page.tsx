import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SettingsPanel } from "@/components/settings/settings-panel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

export default async function SettingsPage() {
  const t = await getTranslations("settings");

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>{t("title")}</h1>
      <SettingsPanel />
    </div>
  );
}
