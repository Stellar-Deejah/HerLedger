import Link from "next/link";

// Root-level 404 fallback, rendered only for requests that match no locale
// (and therefore no [locale] route). Locale-aware 404s live in
// app/[locale]/not-found.tsx, which carries the active locale's translations.
// next/link is used (with a typedRoutes cast) because the home route only
// exists under the [locale] segment and there's no locale context here — the
// request for "/" is redirected to the appropriate locale by the middleware.
export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        Page not found
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        The page you were looking for does not exist.
      </p>
      <Link href={"/" as never} style={{ color: "var(--color-brand, inherit)" }}>
        Return to home
      </Link>
    </main>
  );
}
