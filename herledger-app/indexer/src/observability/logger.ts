import pino, { type Logger, type LoggerOptions, type DestinationStream } from "pino";
import { getCorrelationId } from "./context.js";

export const defaultLogLevel = process.env["LOG_LEVEL"] ?? "info";
export const serviceName = process.env["SERVICE_NAME"] ?? "indexer";
export const environment = process.env["NODE_ENV"] ?? "development";

/**
 * Creates a structured JSON Pino logger instance configured for the indexer.
 * Automatically injects service, environment, ISO timestamp, and dynamic
 * correlationId via AsyncLocalStorage mixin.
 */
export function createLogger(
  options: LoggerOptions = {},
  destination?: DestinationStream
): Logger {
  const pinoOptions: LoggerOptions = {
    level: process.env["LOG_LEVEL"] ?? options.level ?? "info",
    base: {
      service: serviceName,
      environment,
      ...options.base,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
      ...options.formatters,
    },
    mixin() {
      const correlationId = getCorrelationId();
      return correlationId ? { correlationId } : {};
    },
    ...options,
  };

  return destination ? pino(pinoOptions, destination) : pino(pinoOptions);
}

export const logger = createLogger();
