import { DashboardNav } from "@/components/navigation/dashboard-nav";
import { WalletProvider } from "@/components/wallet/wallet-provider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <div className="dashboard-layout">
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
    </WalletProvider>
  );
}
