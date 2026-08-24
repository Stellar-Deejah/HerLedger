import { typedJson } from "@/lib/api/route-handler";

import type { HealthResponse } from "./schema";

export function GET() {
  return typedJson<HealthResponse>({ data: { status: "ok" }, error: null });
}
