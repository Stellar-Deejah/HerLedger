import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getPrismaClient } from "../../db/client.js";
import { findEventsByBusiness } from "../../db/schema/financial-events.js";
import { findAttestationsByEvent } from "../../db/schema/attestations.js";

// ---------------------------------------------------------------------------
// Business routes — read-only indexed data
// ---------------------------------------------------------------------------

const businessIdSchema = z.object({
  businessId: z.string().min(1).max(64),
});

const paginationSchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function businessRoutes(app: FastifyInstance): Promise<void> {
  // GET /businesses/:businessId
  app.get<{ Params: { businessId: string } }>("/:businessId", async (req, reply) => {
    const params = businessIdSchema.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({
        data: null,
        error: { code: "INVALID_PARAMS", message: "Invalid business ID" },
      });
    }

    const business = await getPrismaClient().businessProfile.findUnique({
      where: { businessId: params.data.businessId },
      select: {
        businessId: true,
        walletAddress: true,
        displayName: true,
        metadataHash: true,
        active: true,
        createdAt: true,
      },
    });

    if (!business) {
      return reply.status(404).send({
        data: null,
        error: { code: "BUSINESS_NOT_FOUND", message: "Business not found" },
      });
    }

    return reply.send({ data: business, error: null });
  });

  // GET /businesses/:businessId/events
  app.get<{
    Params: { businessId: string };
    Querystring: { offset?: string; limit?: string };
  }>("/:businessId/events", async (req, reply) => {
    const params = businessIdSchema.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({
        data: null,
        error: { code: "INVALID_PARAMS", message: "Invalid business ID" },
      });
    }

    const pagination = paginationSchema.safeParse(req.query);
    if (!pagination.success) {
      return reply.status(400).send({
        data: null,
        error: { code: "INVALID_PARAMS", message: "Invalid pagination parameters" },
      });
    }

    const events = await findEventsByBusiness(
      getPrismaClient(),
      params.data.businessId,
      pagination.data.offset,
      pagination.data.limit
    );

    return reply.send({
      data: {
        events,
        pagination: {
          offset: pagination.data.offset,
          limit: pagination.data.limit,
          count: events.length,
        },
      },
      error: null,
    });
  });

  // GET /businesses/:businessId/attestations
  app.get<{ Params: { businessId: string } }>("/:businessId/attestations", async (req, reply) => {
    const params = businessIdSchema.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({
        data: null,
        error: { code: "INVALID_PARAMS", message: "Invalid business ID" },
      });
    }

    // Get all event IDs for this business, then fetch attestations
    const events = await getPrismaClient().financialEvent.findMany({
      where: { businessId: params.data.businessId },
      select: { eventId: true },
    });

    const attestationsByEvent = await Promise.all(
      events.map(({ eventId }: { eventId: string }) =>
        findAttestationsByEvent(getPrismaClient(), eventId)
      )
    );

    const attestations = attestationsByEvent.flat();
    return reply.send({ data: { attestations }, error: null });
  });
}
