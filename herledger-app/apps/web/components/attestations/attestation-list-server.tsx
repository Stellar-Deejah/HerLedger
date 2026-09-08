import { getAttestations } from "@/lib/data/attestations";

import { AttestationList } from "./attestation-list";

interface AttestationListServerProps {
  businessId: string | null;
}

/**
 * Server Component: fetches the DB-indexed attestation list during SSR.
 * The client-side on-chain re-validation (isValidAttestation / resync — see
 * AttestationList's own comment) still runs after hydration; it needs a
 * browser-reachable Stellar RPC call per row and stays a client concern.
 */
export async function AttestationListServer({ businessId }: AttestationListServerProps) {
  let data: Awaited<ReturnType<typeof getAttestations>> | null = null;
  try {
    data = await getAttestations(businessId, false);
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <div role="alert" style={{ color: "var(--danger)" }}>
        Could not load attestations.
      </div>
    );
  }

  return <AttestationList initialAttestations={data.attestations} />;
}
