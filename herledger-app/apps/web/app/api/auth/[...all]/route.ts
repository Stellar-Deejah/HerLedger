import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/server";

const { GET, POST: authPost } = toNextJsHandler(auth);

/**
 * Better Auth's rate limiter (lib/auth/server.ts's `rateLimit` config)
 * signals a 429 with its own `x-retry-after` header (seconds) rather than
 * the standard `Retry-After` -- confirmed empirically, not documented.
 * Mirroring it onto `Retry-After` here means any client or intermediary
 * that only understands the standard header still gets a usable value.
 */
async function POST(req: NextRequest) {
  const res = await authPost(req);
  if (res.status === 429 && !res.headers.has("retry-after")) {
    const seconds = res.headers.get("x-retry-after");
    if (seconds) {
      const headers = new Headers(res.headers);
      headers.set("retry-after", seconds);
      return new NextResponse(res.body, { status: res.status, headers });
    }
  }
  return res;
}

export { GET, POST };
