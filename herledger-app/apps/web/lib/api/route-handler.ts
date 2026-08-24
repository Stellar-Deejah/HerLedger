import { NextResponse } from "next/server";

/**
 * Thin wrapper around NextResponse.json() with an explicit generic.
 *
 * Call it as `typedJson<ActivityRecentResponse>({ ... })`. Because the
 * payload is checked against the route's own ResponseSchema-inferred type
 * (not `any`/`unknown`), a change to the schema that the handler body no
 * longer satisfies is a `tsc` build error — this is what gives us
 * "server-side schema change that breaks a client type is caught at
 * compile time" without a runtime `.parse()` on every response.
 */
export function typedJson<T>(payload: T, init?: ResponseInit) {
  return NextResponse.json(payload, init);
}
