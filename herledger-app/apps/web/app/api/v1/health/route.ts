import { NextRequest } from "next/server";

import { getClientIp } from "@/lib/api/rate-limit";
import { readLimiter } from "@/lib/api/rate-limit-config";
import { typedJson } from "@/lib/api/route-handler";

import type { HealthResponse } from "./schema";

export function GET(req?: NextRequest) {
  if (req) {
    const limited = readLimiter.check(getClientIp(req));
    if (limited) return limited;
  }

  return typedJson<HealthResponse>({ data: { status: "ok" }, error: null });
}
