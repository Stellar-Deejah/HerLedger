import type { Metadata } from "next";

import { SettingsPanel } from "@/components/settings/settings-panel";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>Settings</h1>
      <SettingsPanel />
    </div>
  );
}
