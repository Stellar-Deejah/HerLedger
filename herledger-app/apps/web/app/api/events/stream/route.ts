
import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";
import { requireBusinessOwner } from "@/lib/auth/require-business-owner";

const prisma = getPrismaClient();
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ownership = await requireBusinessOwner(session);
  if (!ownership.ok) {
    return new Response(JSON.stringify({ error: ownership.message, code: ownership.code }), {
      status: ownership.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  let lastChecked = new Date();
  const encoder = new TextEncoder();
  let pollInterval: NodeJS.Timeout;
  let pingInterval: NodeJS.Timeout;
  let maxTimeout: NodeJS.Timeout;

  const stream = new ReadableStream({
    async start(controller) {
      pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(":\n\n"));
        } catch {
          // Controller may already be closed (client disconnected) -- nothing to do.
        }
      }, 20000);

      const checkEvents = async () => {
        try {
          const events = await prisma.financialEvent.findMany({
            where: {
              businessId: ownership.businessId,
              updatedAt: { gt: lastChecked },
            },
            orderBy: { updatedAt: "asc" },
          });

          const lastEvent = events[events.length - 1];
          if (lastEvent) {
            lastChecked = lastEvent.updatedAt;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(events)}\n\n`));
          }
        } catch (err) {
          console.error("SSE Poll error", err);
        }
      };

      pollInterval = setInterval(checkEvents, 5000);

      maxTimeout = setTimeout(() => {
        clearInterval(pollInterval);
        clearInterval(pingInterval);
        try {
          controller.close();
        } catch {
          // Controller may already be closed -- nothing to do.
        }
      }, 55000);

      req.signal.addEventListener("abort", () => {
        clearInterval(pollInterval);
        clearInterval(pingInterval);
        clearTimeout(maxTimeout);
      });
    },
    cancel() {
      clearInterval(pollInterval);
      clearInterval(pingInterval);
      clearTimeout(maxTimeout);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
