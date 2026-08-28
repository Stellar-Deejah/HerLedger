import Fastify, { type FastifyInstance, type FastifyBaseLogger } from "fastify";
import { registerRoutes } from "./routes/index.js";
import { logger, generateCorrelationId, runWithContext } from "../observability/index.js";

declare module "fastify" {
  interface FastifyRequest {
    correlationId: string;
  }
}

// ---------------------------------------------------------------------------
// Indexer HTTP API server
// ---------------------------------------------------------------------------

export function buildServer(): FastifyInstance {
  const app = Fastify({
    loggerInstance: logger as unknown as FastifyBaseLogger,
    disableRequestLogging: false,
  });

  // Correlation ID middleware: extracts or generates correlationId,
  // sets response header, attaches child logger, and wraps AsyncLocalStorage context.
  app.addHook("onRequest", (request, reply, done) => {
    const rawHeader = request.headers["x-correlation-id"] ?? request.headers["x-request-id"];
    const correlationId =
      typeof rawHeader === "string" && rawHeader.trim() !== ""
        ? rawHeader.trim()
        : Array.isArray(rawHeader) && rawHeader[0] && rawHeader[0].trim() !== ""
          ? rawHeader[0].trim()
          : generateCorrelationId();

    request.correlationId = correlationId;
    void reply.header("x-correlation-id", correlationId);
    request.log = logger.child({ correlationId }) as unknown as FastifyBaseLogger;

    runWithContext({ correlationId }, () => {
      done();
    });
  });

  // Global error handler — never expose stack traces to clients
  app.setErrorHandler((error, request, reply) => {
    const log = request?.log ?? logger;
    log.error({ err: error, correlationId: request?.correlationId }, "Unhandled request error");
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
