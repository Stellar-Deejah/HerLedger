import { NextResponse } from "next/server";

import { buildWebOpenApiSpec } from "@/lib/api/openapi";

export async function GET() {
  const spec = buildWebOpenApiSpec();
  return NextResponse.json(spec);
}
