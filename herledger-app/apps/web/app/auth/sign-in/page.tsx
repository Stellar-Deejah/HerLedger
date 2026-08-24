import type { Metadata } from "next";

import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
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
          Sign in to HerLedger
        </h1>
        <p
          style={{
            color: "var(--muted)",
            textAlign: "center",
            marginBottom: "2rem",
            fontSize: "0.9375rem",
          }}
        >
          Access your business financial history
        </p>
        <SignInForm />
      </div>
    </main>
  );
}
