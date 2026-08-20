export function TrustSimulatorSkeleton() {
  return (
    <section
      style={{
        maxWidth: "960px",
        margin: "0 auto 6rem",
        padding: "0 1.5rem",
      }}
      aria-busy="true"
      aria-label="Loading trust simulator"
    >
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          background: "var(--color-muted-bg)",
          padding: "2.5rem 2rem",
          minHeight: "320px",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <div
          style={{
            height: "28px",
            width: "50%",
            margin: "0 auto",
            background: "var(--border)",
            borderRadius: "var(--radius-sm)",
          }}
        />
        <div
          style={{
            height: "18px",
            width: "70%",
            margin: "0 auto",
            background: "var(--border)",
            borderRadius: "var(--radius-sm)",
          }}
        />
        <div
          style={{
            height: "120px",
            width: "100%",
            background: "var(--border)",
            borderRadius: "var(--radius-md)",
            marginTop: "1rem",
          }}
        />
      </div>
    </section>
  );
}
