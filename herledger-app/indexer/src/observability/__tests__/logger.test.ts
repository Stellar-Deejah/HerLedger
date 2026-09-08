import { describe, it, expect } from "vitest";
import { Writable } from "node:stream";
import { createLogger } from "../logger.js";
import { runWithContext } from "../context.js";

describe("Structured Pino Logger", () => {
  it("formats log entries with service, environment, and ISO time", () => {
    const logs: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        logs.push(chunk.toString());
        callback();
      },
    });

    const streamLogger = createLogger(
      {
        level: "info",
        base: { service: "indexer-test", environment: "test" },
      },
      stream
    );

    streamLogger.info({ event: "test-event" }, "Hello test");

    expect(logs.length).toBe(1);
    const parsed = JSON.parse(logs[0] ?? "{}");

    expect(parsed.level).toBe("info");
    expect(parsed.service).toBe("indexer-test");
    expect(parsed.environment).toBe("test");
    expect(parsed.event).toBe("test-event");
    expect(parsed.msg).toBe("Hello test");
    expect(parsed.time).toBeDefined();
  });

  it("automatically attaches correlationId from AsyncLocalStorage context", async () => {
    const logs: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        logs.push(chunk.toString());
        callback();
      },
    });

    const streamLogger = createLogger(
      {
        level: "info",
        base: { service: "indexer-test", environment: "test" },
      },
      stream
    );

    await runWithContext({ correlationId: "corr-xyz-987" }, async () => {
      streamLogger.info({ event: "operation-start" }, "Operation begun");
    });

    expect(logs.length).toBe(1);
    const parsed = JSON.parse(logs[0] ?? "{}");
    expect(parsed.correlationId).toBe("corr-xyz-987");
    expect(parsed.event).toBe("operation-start");
  });

  it("respects LOG_LEVEL configuration", () => {
    const logs: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        logs.push(chunk.toString());
        callback();
      },
    });

    const warnLogger = createLogger(
      {
        level: "warn",
        base: { service: "indexer-test", environment: "test" },
      },
      stream
    );

    warnLogger.info({ event: "should-not-log" }, "Info log");
    warnLogger.warn({ event: "should-log" }, "Warn log");

    expect(logs.length).toBe(1);
    const parsed = JSON.parse(logs[0] ?? "{}");
    expect(parsed.level).toBe("warn");
    expect(parsed.event).toBe("should-log");
  });

  it("redacts amount, walletAddress, and stellarReference at INFO log level", () => {
    const logs: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        logs.push(chunk.toString());
        callback();
      },
    });

    const infoLogger = createLogger(
      {
        level: "info",
        base: { service: "indexer-test", environment: "test" },
      },
      stream
    );

    infoLogger.info(
      {
        event: "financial_event_indexed",
        amount: "100.0000000",
        walletAddress: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYSFSSTY2ELW6CUSIZD",
        stellarReference: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      },
      "Financial event indexed"
    );

    expect(logs.length).toBe(1);
    const parsed = JSON.parse(logs[0] ?? "{}");
    expect(parsed.amount).toBe("[REDACTED]");
    expect(parsed.walletAddress).toBe("[REDACTED]");
    expect(parsed.stellarReference).toBe("[REDACTED]");
  });

  it("preserves full un-redacted fields at DEBUG log level", () => {
    const logs: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        logs.push(chunk.toString());
        callback();
      },
    });

    const debugLogger = createLogger(
      {
        level: "debug",
        base: { service: "indexer-test", environment: "test" },
      },
      stream
    );

    const fullWallet = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYSFSSTY2ELW6CUSIZD";
    const fullTxHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    debugLogger.debug(
      {
        event: "financial_event_indexed",
        amount: "100.0000000",
        walletAddress: fullWallet,
        stellarReference: fullTxHash,
      },
      "Financial event indexed debug"
    );

    expect(logs.length).toBe(1);
    const parsed = JSON.parse(logs[0] ?? "{}");
    expect(parsed.amount).toBe("100.0000000");
    expect(parsed.walletAddress).toBe(fullWallet);
    expect(parsed.stellarReference).toBe(fullTxHash);
  });
});
