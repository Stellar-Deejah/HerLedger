"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { ErrorMessage } from "@/components/ui/error-message";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Link, useRouter } from "@/i18n/navigation";
import { validateCallbackUrl } from "@/lib/auth/callback-url";
import { signIn } from "@/lib/auth/client";
import { EMAIL_NOT_VERIFIED_ERROR, normalizeSignInError } from "@/lib/auth/messages";
import { runExclusive } from "@/lib/utils/submit-guard";

export function SignInForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
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
    await runExclusive(submittingRef, async () => {
      setError(null);
      setLoading(true);
      try {
        const result = await signIn.email({ email, password });
        if (result.error) {
          setError(normalizeSignInError(result.error));
        } else {
          const rawCallback = searchParams?.get("callbackUrl");
          const validated = validateCallbackUrl(rawCallback);
          // The middleware stores the caller's original (locale-prefixed)
          // pathname as the callback; strip the active locale prefix so the
          // locale-aware router doesn't prefix it a second time.
          const prefix = `/${locale}`;
          const targetUrl =
            validated && validated.startsWith(`${prefix}/`)
              ? validated.slice(prefix.length)
              : validated;
          router.push(targetUrl || "/dashboard");
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
        autoComplete="current-password"
      />

      {error === EMAIL_NOT_VERIFIED_ERROR && (
        <p style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>
          <Link href={`/auth/verify-email?email=${encodeURIComponent(email)}`}>
            {t("resendVerification")}
          </Link>
        </p>
      )}

      <SubmitButton loading={loading}>{t("signIn")}</SubmitButton>

      <p
        style={{
          textAlign: "center",
          marginTop: "1rem",
          fontSize: "0.875rem",
          color: "var(--muted)",
        }}
      >
        {t("noAccount")} <Link href="/auth/sign-up">{t("createOne")}</Link>
      </p>
    </form>
  );
}
