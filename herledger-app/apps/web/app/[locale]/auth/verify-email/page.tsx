import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("verifyEmailTitle") };
}

export default async function VerifyEmailPage() {
  const t = await getTranslations("auth");

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            marginBottom: "1.5rem",
            textAlign: "center",
          }}
        >
          {t("verifyEmailTitle")}
        </h1>
        <Suspense fallback={<LoadingSpinner />}>
          <VerifyEmailPanel />
        </Suspense>
      </div>
    </main>
  );
}
