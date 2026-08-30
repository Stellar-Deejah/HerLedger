"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter";
import { ErrorMessage } from "@/components/ui/error-message";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Link, useRouter } from "@/i18n/navigation";
import { signUp } from "@/lib/auth/client";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";
import { runExclusive } from "@/lib/utils/submit-guard";

export function SignUpForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // See lib/utils/submit-guard.ts: setLoading() alone can't stop a
  // duplicate request from two submits in the same tick, since the state
  // update hasn't re-rendered (and disabled the button) yet.
  const submittingRef = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("passwordTooShort", { count: MIN_PASSWORD_LENGTH }));
      return;
    }

    await runExclusive(submittingRef, async () => {
      setLoading(true);
      try {
        const result = await signUp.email({
          email,
          password,
          name,
          callbackURL: "/auth/verify-email?verified=true",
        });
        if (result.error) {
          setError(result.error.message ?? t("accountCreationFailed"));
        } else {
          // requireEmailVerification means this response carries no session
          // (see lib/auth/server.ts) — there's no dashboard to redirect to
          // yet.
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}` as unknown as import("next").Route);
        }
      } catch {
        setError(t("unexpectedError"));
      } finally {
        setLoading(false);
      }
    });
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate aria-busy={loading}>
      {error && <ErrorMessage message={error} />}

      <FormField
        id="name"
        label={t("name")}
        type="text"
        value={name}
        onChange={setName}
        required
        autoComplete="name"
      />
      <FormField
        id="email"
        label={t("email")}
        type="email"
        value={email}
        onChange={setEmail}
        required
        autoComplete="email"
      />
      <FormField
        id="password"
        label={t("password")}
        type="password"
        value={password}
        onChange={setPassword}
        required
        autoComplete="new-password"
        description={t("minPassword", { count: MIN_PASSWORD_LENGTH })}
      />
      <PasswordStrengthMeter password={password} userInputs={[name, email]} />

      <SubmitButton loading={loading}>{t("signUp")}</SubmitButton>

      <p
        style={{
          textAlign: "center",
          marginTop: "1rem",
          fontSize: "0.875rem",
          color: "var(--muted)",
        }}
      >
        {t("haveAccount")} <Link href="/auth/sign-in">{t("signIn")}</Link>
      </p>
    </form>
  );
}
