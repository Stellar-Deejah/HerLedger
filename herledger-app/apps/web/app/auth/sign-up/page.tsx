import type { Metadata } from "next";

import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
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
          Create your HerLedger account
        </h1>
        <p
          style={{
            color: "var(--muted)",
            textAlign: "center",
            marginBottom: "2rem",
            fontSize: "0.9375rem",
          }}
        >
          Register your business and start building your financial history
        </p>
        <SignUpForm />
      </div>
    </main>
  );
}
