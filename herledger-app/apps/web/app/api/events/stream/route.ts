import { getDbClient } from "@herledger/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { rateLimitKey } from "@/lib/api/rate-limit";
import { streamLimiter } from "@/lib/api/rate-limit-config";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest | Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  const limited = streamLimiter.check(rateLimitKey(req, session?.user?.id));
  if (limited) return limited;

  if (!session) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const db = getDbClient();
  const profile = await db.businesses.findByUserId(session.user.id);

  if (!profile) {
    return NextResponse.json(
      { data: null, error: { code: "NO_BUSINESS", message: "No business profile registered" } },
      { status: 404 }
    );
  }

  let lastChecked = new Date();
  const encoder = new TextEncoder();

  let pingInterval: NodeJS.Timeout;
  let maxTimeout: NodeJS.Timeout;

  const stream = new ReadableStream({
    async start(controller) {
      pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(":\n\n"));
        } catch {
          // Controller may already be closed
        }
      }, 20000);

      const checkEvents = async () => {
        try {
          const events = await db.financialEvents.findUpdatedAfter(profile.businessId, lastChecked);

          const lastEvent = events[events.length - 1];
          if (lastEvent) {
            lastChecked = lastEvent.updatedAt;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(events)}\n\n`));
          }
        } catch (err) {
          console.error("SSE Poll error", err);
        }
      };

      const pollInterval = setInterval(checkEvents, 2000);

      maxTimeout = setTimeout(() => {
        clearInterval(pollInterval);
        clearInterval(pingInterval);
        try {
          controller.close();
        } catch {
          // Stream might already be closed
        }
      }, 55000);
    },
    cancel() {
      clearInterval(pingInterval);
      clearTimeout(maxTimeout);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
