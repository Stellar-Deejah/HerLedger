import { DashboardNav } from "@/components/navigation/dashboard-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <DashboardNav />
      <main
        style={{
          flex: 1,
          padding: "2rem",
          maxWidth: "1200px",
          marginLeft: "auto",
          marginRight: "auto",
          width: "100%",
        }}
      >
        {children}
      </main>
    </div>
  );
}
