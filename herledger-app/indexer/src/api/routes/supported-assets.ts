import type { FastifyInstance } from "fastify";

export async function supportedAssetsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (_req, reply) => {
    // The supported asset list is authoritative from the on-chain contract.
    // The API exposes this as a read-through from the contract state.
    return reply.send({
      data: {
        note: "Query individual assets via the contract. On-chain state is authoritative.",
      },
      error: null,
    });
  });
}
