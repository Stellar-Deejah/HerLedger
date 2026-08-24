import type { Metadata } from "next";

import { DisputeList } from "@/components/disputes/dispute-list";

export const metadata: Metadata = { title: "Disputes" };

export default function DisputesPage() {
  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>Disputes</h1>
      <DisputeList />
    </div>
  );
}
