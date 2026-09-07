import { Contract, StrKey, xdr } from "@stellar/stellar-sdk";
import { describe, it, expect } from "vitest";

import { parseContractEvents } from "../events.js";
import { ParseError, IndexerError } from "../../types/index.js";
import {
  CONTRACT_EVENT_FIXTURES,
  MALFORMED_FINANCIAL_EVENT_RECORDED_XDR_BASE64,
} from "../__fixtures__/contract-events.js";

const CONTRACT_ID = StrKey.encodeContract(Buffer.alloc(32, 1));

function baseFields(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "0000000001-0000000000",
    type: "contract",
    ledger: 100,
    ledgerClosedAt: new Date().toISOString(),
    transactionIndex: 1,
    operationIndex: 0,
    inSuccessfulContractCall: true,
    txHash: "a".repeat(64),
    topic: [xdr.ScVal.scvSymbol("EventName")],
    value: xdr.ScVal.scvVoid(),
    ...overrides,
  };
}

describe("parseContractEvents", () => {
  it("maps contractId to its strkey address and topic to a string", () => {
    const events = [baseFields({ contractId: new Contract(CONTRACT_ID) })] as unknown as Parameters<
      typeof parseContractEvents
    >[0];

    const [parsed] = parseContractEvents(events);

    expect(parsed).toBeDefined();
    expect(parsed!.contractId).toBe(CONTRACT_ID);
    expect(parsed!.topic).toBe("EventName");
    expect(parsed!.ledgerSequence).toBe(100);
    expect(parsed!.txHash).toBe("a".repeat(64));
  });

  it("skips events with no contractId rather than fabricating one", () => {
    const events = [
      baseFields({ contractId: new Contract(CONTRACT_ID) }),
      baseFields({ contractId: undefined }),
    ] as unknown as Parameters<typeof parseContractEvents>[0];

    const parsed = parseContractEvents(events);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.contractId).toBe(CONTRACT_ID);
  });

  it('falls back to "unknown" when an event has no first topic', () => {
    const events = [
      baseFields({ contractId: new Contract(CONTRACT_ID), topic: [] }),
    ] as unknown as Parameters<typeof parseContractEvents>[0];

    const [parsed] = parseContractEvents(events);

    expect(parsed!.topic).toBe("unknown");
  });

  describe("XDR fixture schema validation", () => {
    for (const [topic, fixture] of Object.entries(CONTRACT_EVENT_FIXTURES)) {
      it(`decodes and validates "${topic}" against its schema`, () => {
        const events = [
          baseFields({
            contractId: new Contract(CONTRACT_ID),
            topic: [xdr.ScVal.scvSymbol(topic)],
            value: xdr.ScVal.fromXDR(fixture.valueXdrBase64, "base64"),
          }),
        ] as unknown as Parameters<typeof parseContractEvents>[0];

        const [parsed] = parseContractEvents(events);

        expect(parsed).toBeDefined();
        expect(parsed!.topic).toBe(topic);
        expect(parsed!.data).toEqual(fixture.expected);
      });
    }

    it("throws a ParseError with the raw XDR when a known topic's payload fails schema validation", () => {
      const events = [
        baseFields({
          contractId: new Contract(CONTRACT_ID),
          topic: [xdr.ScVal.scvSymbol("FinancialEventRecorded")],
          value: xdr.ScVal.fromXDR(MALFORMED_FINANCIAL_EVENT_RECORDED_XDR_BASE64, "base64"),
        }),
      ] as unknown as Parameters<typeof parseContractEvents>[0];

      let thrown: unknown;
      try {
        parseContractEvents(events);
      } catch (err) {
        thrown = err;
      }

      expect(thrown).toBeInstanceOf(ParseError);
      expect(thrown).toBeInstanceOf(IndexerError);
      const parseErr = thrown as ParseError;
      expect(parseErr.rawXdr).toBe(MALFORMED_FINANCIAL_EVENT_RECORDED_XDR_BASE64);
      expect(parseErr.message).toContain("FinancialEventRecorded");
    });

    it("does not throw and leaves data empty for a topic with no known schema", () => {
      const events = [
        baseFields({
          contractId: new Contract(CONTRACT_ID),
          topic: [xdr.ScVal.scvSymbol("SomeFutureEvent")],
          value: xdr.ScVal.fromXDR(
            CONTRACT_EVENT_FIXTURES["FinancialEventRecorded"]!.valueXdrBase64,
            "base64"
          ),
        }),
      ] as unknown as Parameters<typeof parseContractEvents>[0];

      const [parsed] = parseContractEvents(events);

      expect(parsed!.topic).toBe("SomeFutureEvent");
      expect(parsed!.data).toEqual({});
    });
  });
});
