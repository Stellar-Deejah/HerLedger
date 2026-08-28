import { NextResponse } from "next/server";
import { NextRequest, NextResponse } from "next/server";

import { buildWebOpenApiSpec } from "@/lib/api/openapi";
import { getClientIp } from "@/lib/api/rate-limit";
import { readLimiter } from "@/lib/api/rate-limit-config";

export async function GET(req: NextRequest) {
  const limited = readLimiter.check(getClientIp(req));
  if (limited) return limited;

  const spec = buildWebOpenApiSpec();
  return NextResponse.json(spec);
}
