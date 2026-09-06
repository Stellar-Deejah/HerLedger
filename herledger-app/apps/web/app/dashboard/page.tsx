import type { Metadata } from "next";
import { DashboardSummary } from "@/components/activity/dashboard-summary";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>Dashboard</h1>
      <DashboardSummary />
    </div>
  );
}
