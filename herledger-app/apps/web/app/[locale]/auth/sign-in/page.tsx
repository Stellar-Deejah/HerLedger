import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SignInForm } from "@/components/auth/sign-in-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signIn") };
}

export default async function SignInPage() {
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
            marginBottom: "0.5rem",
            textAlign: "center",
          }}
        >
          {t("signInTitle")}
        </h1>
        <p
          style={{
            color: "var(--muted)",
            textAlign: "center",
            marginBottom: "2rem",
            fontSize: "0.9375rem",
          }}
        >
          {t("signInSubtitle")}
        </p>
        <SignInForm />
      </div>
    </main>
  );
}
