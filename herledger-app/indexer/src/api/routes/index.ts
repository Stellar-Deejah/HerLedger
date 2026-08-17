import type { FastifyInstance, FastifyPluginAsync, preHandlerHookHandler } from "fastify";
import { getServerEnv } from "@herledger/config";
import { healthRoutes } from "./health.js";
import { businessRoutes } from "./businesses.js";
import { supportedAssetsRoutes } from "./supported-assets.js";
import { indexerStatusRoutes } from "./indexer-status.js";
import { transactionRoutes } from "./transactions.js";
import { getPrismaClient } from "../../db/client.js";
import { requirePersonalAccessToken } from "../auth/personal-access-token.js";

/**
 * Registers `plugin` under `prefix` inside its own encapsulated Fastify
 * context with `preHandler` applied to every route it defines. Fastify's
 * plugin encapsulation means a hook added via `addHook` here does not leak
 * out to routes registered outside this scope.
 */
function registerProtected(
  app: FastifyInstance,
  plugin: FastifyPluginAsync,
  prefix: string,
  preHandler: preHandlerHookHandler
): void {
  void app.register(
    async (scoped) => {
      scoped.addHook("preHandler", preHandler);
      await scoped.register(plugin);
    },
    { prefix }
  );
}

export function registerRoutes(app: FastifyInstance): void {
  // Public — no per-business financial data exposed.
  void app.register(healthRoutes, { prefix: "/health" });
  void app.register(supportedAssetsRoutes, { prefix: "/supported-assets" });
  void app.register(indexerStatusRoutes, { prefix: "/indexer" });

  // Personal access token (Bearer scheme) required — these routes read a
  // business's financial events, so third-party integrations must
  // authenticate with a token instead of reading anonymously.
  // See "Personal Access Tokens" in the README for how a token is created.
  const pepper = getServerEnv().BETTER_AUTH_SECRET;
  const requireToken = requirePersonalAccessToken(getPrismaClient(), pepper);

  registerProtected(app, businessRoutes, "/businesses", requireToken);
  registerProtected(app, transactionRoutes, "/transactions", requireToken);
}
