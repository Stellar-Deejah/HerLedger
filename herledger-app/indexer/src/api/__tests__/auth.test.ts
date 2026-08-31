import { describe, it, expect, beforeEach } from "vitest";
import Fastify from "fastify";
import { createAuthMiddleware, isPublicRoute } from "../auth.js";

describe("Authentication Middleware", () => {
  const TEST_SECRET = "test-secret-at-least-32-characters-long";
  let authMiddleware: ReturnType<typeof createAuthMiddleware>;

  beforeEach(() => {
    authMiddleware = createAuthMiddleware(TEST_SECRET);
  });

  describe("createAuthMiddleware", () => {
    it("allows requests with valid X-Indexer-Secret header", async () => {
      const app = Fastify();
      app.addHook("onRequest", authMiddleware);
      app.get("/test", async (_req, reply) => {
        return reply.send({ success: true });
      });
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/test",
        headers: { "x-indexer-secret": TEST_SECRET },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });

    it("rejects requests without X-Indexer-Secret header", async () => {
      const app = Fastify();
      app.addHook("onRequest", authMiddleware);
      app.get("/test", async (_req, reply) => {
        return reply.send({ success: true });
      });
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/test",
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error).toEqual({
        code: "UNAUTHORIZED",
        message: "Missing authentication header",
      });
    });

    it("rejects requests with wrong X-Indexer-Secret header", async () => {
      const app = Fastify();
      app.addHook("onRequest", authMiddleware);
      app.get("/test", async (_req, reply) => {
        return reply.send({ success: true });
      });
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/test",
        headers: { "x-indexer-secret": "wrong-secret" },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error).toEqual({
        code: "UNAUTHORIZED",
        message: "Invalid authentication token",
      });
    });

    it("handles array header values (defensive)", async () => {
      const app = Fastify();
      app.addHook("onRequest", authMiddleware);
      app.get("/test", async (_req, reply) => {
        return reply.send({ success: true });
      });
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/test",
        headers: { "x-indexer-secret": [TEST_SECRET] },
      });

      expect(res.statusCode).toBe(200);
    });

    it("rejects array header with wrong secret", async () => {
      const app = Fastify();
      app.addHook("onRequest", authMiddleware);
      app.get("/test", async (_req, reply) => {
        return reply.send({ success: true });
      });
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/test",
        headers: { "x-indexer-secret": ["wrong-secret"] },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("isPublicRoute", () => {
    it("returns true for health endpoints", () => {
      expect(isPublicRoute("/health")).toBe(true);
      expect(isPublicRoute("/v1/health")).toBe(true);
      expect(isPublicRoute("/health/status")).toBe(true);
    });

    it("returns true for metrics endpoint", () => {
      expect(isPublicRoute("/metrics")).toBe(true);
    });

    it("returns true for openapi endpoints", () => {
      expect(isPublicRoute("/openapi.json")).toBe(true);
      expect(isPublicRoute("/v1/openapi.json")).toBe(true);
    });

    it("returns false for protected routes", () => {
      expect(isPublicRoute("/v1/businesses/123")).toBe(false);
      expect(isPublicRoute("/v1/transactions/abc")).toBe(false);
      expect(isPublicRoute("/v1/admin/replay/err-1")).toBe(false);
    });

    it("returns false for root path", () => {
      expect(isPublicRoute("/")).toBe(false);
    });
  });
});
