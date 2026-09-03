"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { useSession, signOut } from "@/lib/auth/client";

export function SettingsPanel() {
  const t = useTranslations("settings");
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleLocaleChange(nextLocale: string) {
    if (nextLocale === locale || !routing.locales.includes(nextLocale as Locale)) return;
    // Keeps the user on the same page, just in the new locale (e.g.
    // /dashboard/settings -> /es/dashboard/settings).
    router.replace(pathname, { locale: nextLocale as Locale });
  }

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsDeleting(true);

    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || t("deleteFailed"));
      }

      await signOut();
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("deleteFailed"));
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
          {t("account")}
        </h2>
        {session ? (
          <dl style={{ fontSize: "0.9375rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <dt style={{ color: "var(--muted)", minWidth: "80px" }}>{t("name")}</dt>
              <dd>{session.user.name ?? "—"}</dd>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <dt style={{ color: "var(--muted)", minWidth: "80px" }}>{t("email")}</dt>
              <dd>{session.user.email}</dd>
            </div>
          </dl>
        ) : (
          <p style={{ color: "var(--muted)" }}>{t("loading")}</p>
        )}
      </section>

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          {t("language")}
        </h2>
        <label
          htmlFor="locale-switcher"
          style={{
            display: "block",
            fontSize: "0.875rem",
            color: "var(--muted)",
            marginBottom: "0.5rem",
          }}
        >
          {t("language")}
        </label>
        <select
          id="locale-switcher"
          value={locale}
          onChange={(e) => handleLocaleChange(e.target.value)}
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            backgroundColor: "var(--background)",
            fontSize: "0.9375rem",
          }}
        >
          {routing.locales.map((l) => (
            <option key={l} value={l}>
              {t(`locales.${l}`)}
            </option>
          ))}
        </select>
      </section>

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          {t("privacy")}
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
          {t("privacyBody1")}
        </p>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "0.875rem",
            marginTop: "0.75rem",
            lineHeight: 1.6,
          }}
        >
          {t("privacyBody2")}
        </p>
      </section>

      <section
        style={{
          border: "1px solid var(--destructive)",
          borderRadius: "var(--radius)",
          padding: "1.5rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: 600,
            marginBottom: "0.75rem",
            color: "var(--destructive)",
          }}
        >
          {t("dangerZone")}
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9375rem", marginBottom: "1rem" }}>
          {t("deleteWarning")}
        </p>

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "var(--destructive)",
              color: "white",
              borderRadius: "var(--radius)",
              border: "none",
              cursor: "pointer",
            }}
          >
            {t("deleteAccount")}
          </button>
        ) : (
          <form
            onSubmit={handleDelete}
            style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "400px" }}
          >
            <div
              style={{
                padding: "1rem",
                backgroundColor: "var(--destructive-foreground)",
                borderRadius: "var(--radius)",
              }}
            >
              <p style={{ fontWeight: 500, marginBottom: "0.5rem" }}>{t("deleteConfirmTitle")}</p>
              <p style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
                {t("deleteConfirmBody")}
              </p>
            </div>

            <div>
              <label
                htmlFor="password"
                style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}
              >
                {t("confirmPassword")}
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--background)",
                }}
              />
            </div>

            {error && <p style={{ color: "var(--destructive)", fontSize: "0.875rem" }}>{error}</p>}

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                }}
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={isDeleting || !password}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "var(--destructive)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--radius)",
                  cursor: isDeleting || !password ? "not-allowed" : "pointer",
                  opacity: isDeleting || !password ? 0.7 : 1,
                }}
              >
                {isDeleting ? t("deleting") : t("confirmDeletion")}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
