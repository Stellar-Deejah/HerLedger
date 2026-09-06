import Fastify from "fastify";
import { registerRoutes } from "./routes/index.js";

// ---------------------------------------------------------------------------
// Indexer HTTP API server
// ---------------------------------------------------------------------------

export function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env["NODE_ENV"] === "production" ? "warn" : "info",
      transport: process.env["NODE_ENV"] !== "production" ? { target: "pino-pretty" } : undefined,
    },
  });

  // Global error handler — never expose stack traces to clients
  app.setErrorHandler((error, _request, reply) => {
    app.log.error({ err: error, msg: "Unhandled request error" });
    void reply.status(500).send({
      data: null,
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    void reply.status(404).send({
      data: null,
      error: { code: "NOT_FOUND", message: "Route not found" },
    });
  });

  registerRoutes(app);

  return app;
}
