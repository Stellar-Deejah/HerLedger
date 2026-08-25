import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { CSV_HEADER_ROW, financialEventToCsvRow } from "@/lib/activity/csv";
import { auth } from "@/lib/auth/server";
import { toDateRange } from "@/lib/utils/date-range";
import { getDbClient, type DbClient } from "@herledger/db";

import { RequestSchema } from "./schema";

// ---------------------------------------------------------------------------
// GET /api/v1/activity/export -- streams every FinancialEvent for the
// authenticated business (optionally date-filtered) as CSV.
//
// Uses a Web ReadableStream (rather than Node's `stream.Readable`) so the
// handler stays on the same Request/Response primitives every other Route
// Handler in this app already uses -- no Node-stream adapter, and it works
// unchanged if this route is ever deployed to the Edge runtime. Rows are
// paged out of the database (EXPORT_PAGE_SIZE at a time) instead of loading
// the full export into memory, so a business with a very long history
// doesn't require holding its entire dataset in the server's heap at once.
// ---------------------------------------------------------------------------

const EXPORT_PAGE_SIZE = 500;

function jsonError(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify({ data: null, error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildCsvStream(
  db: DbClient,
  businessId: string,
  range: { startDate?: Date; endDate?: Date }
) {
  const encoder = new TextEncoder();
  let offset = 0;
  let headerSent = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!headerSent) {
        controller.enqueue(encoder.encode(CSV_HEADER_ROW));
        headerSent = true;
      }

      const events = await db.financialEvents.findRecentByBusiness(businessId, {
        offset,
        limit: EXPORT_PAGE_SIZE,
        ...range,
      });

      for (const event of events) {
        controller.enqueue(encoder.encode(financialEventToCsvRow(event)));
      }
      offset += events.length;

      if (events.length < EXPORT_PAGE_SIZE) {
        controller.close();
      }
    },
  });
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return jsonError("UNAUTHORIZED", "Not authenticated", 401);
  }

  const { searchParams } = new URL(req.url);
  const parsed = RequestSchema.safeParse({
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
  });
  if (!parsed.success) {
    return jsonError("INVALID_PARAMS", "Invalid date range params", 400);
  }

  const db = getDbClient();
  const profile = await db.businesses.findByUserId(session.user.id);

  if (!profile) {
    // No business yet -- a valid, empty export rather than an error.
    const encoder = new TextEncoder();
    return new Response(encoder.encode(CSV_HEADER_ROW), {
      status: 200,
      headers: csvHeaders(),
    });
  }

  const range = toDateRange({
    ...(parsed.data.startDate ? { startDate: parsed.data.startDate } : {}),
    ...(parsed.data.endDate ? { endDate: parsed.data.endDate } : {}),
  });

  const stream = buildCsvStream(db, profile.businessId, range);

  return new Response(stream, { status: 200, headers: csvHeaders() });
}

function csvHeaders(): HeadersInit {
  const filename = `herledger-activity-${new Date().toISOString().slice(0, 10)}.csv`;
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  };
}
