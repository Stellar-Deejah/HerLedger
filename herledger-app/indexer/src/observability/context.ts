import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export interface ObservabilityContext {
  correlationId: string;
  [key: string]: unknown;
}

const asyncLocalStorage = new AsyncLocalStorage<ObservabilityContext>();

/**
 * Runs a function within an observability context containing a correlation ID.
 */
export function runWithContext<T>(context: ObservabilityContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Gets the current correlation ID from the active AsyncLocalStorage context,
 * or undefined if running outside a context.
 */
export function getCorrelationId(): string | undefined {
  return asyncLocalStorage.getStore()?.correlationId;
}

/**
 * Gets the entire active observability context.
 */
export function getContext(): ObservabilityContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Helper to generate a new correlation ID (UUID v4).
 */
export function generateCorrelationId(): string {
  return randomUUID();
}
