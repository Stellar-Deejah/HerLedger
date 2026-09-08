import pino, { type Logger, type LoggerOptions, type DestinationStream } from "pino";
import { getCorrelationId } from "./context.js";

export const defaultLogLevel = process.env["LOG_LEVEL"] ?? "info";
export const serviceName = process.env["SERVICE_NAME"] ?? "indexer";
export const environment = process.env["NODE_ENV"] ?? "development";

/**
 * Creates a structured JSON Pino logger instance configured for the indexer.
 * Automatically injects service, environment, ISO timestamp, and dynamic
 * correlationId via AsyncLocalStorage mixin.
 *
 * Automatically redacts sensitive financial and PII fields (amount, walletAddress,
 * stellarReference) at INFO level and higher; full un-redacted values are only
 * logged when log level is DEBUG.
 */
export function createLogger(options: LoggerOptions = {}, destination?: DestinationStream): Logger {
  const level = process.env["LOG_LEVEL"] ?? options.level ?? "info";
  const isDebug = level === "debug";

  const defaultRedact = isDebug
    ? undefined
    : {
        paths: [
          "amount",
          "walletAddress",
          "stellarReference",
          "*.amount",
          "*.walletAddress",
          "*.stellarReference",
          "context.walletAddress",
        ],
        censor: "[REDACTED]",
      };

  const redact = options.redact ?? defaultRedact;

  const pinoOptions: LoggerOptions = {
    level,
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
    ...(redact ? { redact } : {}),
    ...options,
  };

  return destination ? pino(pinoOptions, destination) : pino(pinoOptions);
}

export const logger = createLogger();
