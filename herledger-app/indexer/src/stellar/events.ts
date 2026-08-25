import { rpc as StellarRpc, xdr } from "@stellar/stellar-sdk";
import { decodeAddress, decodeI128 } from "@herledger/sdk";
import { ParseError } from "../types/index.js";
import { CONTRACT_EVENT_SCHEMAS, isKnownContractEventTopic } from "./event-schemas.js";

// ---------------------------------------------------------------------------
// Soroban contract event parsing
// ---------------------------------------------------------------------------

export interface ParsedContractEvent {
  ledgerSequence: number;
  contractId: string;
  topic: string;
  value: xdr.ScVal;
  txHash: string;
  /**
   * The event's data payload, decoded to plain JS values and validated
   * against `CONTRACT_EVENT_SCHEMAS[topic]`. Empty for topics this indexer
   * doesn't have a schema for yet -- those are still surfaced (via `topic`)
   * rather than dropped, but their payload isn't decoded or validated.
   */
  data: Record<string, unknown>;
}

/**
 * Decode a single Soroban `ScVal` into a plain JS value, for the field types
 * HerLedger's contract events actually use. Anything else decodes to
 * `undefined`, which reliably fails Zod validation rather than silently
 * producing a wrong-shaped value.
 */
function decodeScValLoosely(val: xdr.ScVal): unknown {
  switch (val.switch().name) {
    case "scvAddress":
      return decodeAddress(val);
    case "scvBytes":
      return Buffer.from(val.bytes()).toString("hex");
    case "scvSymbol":
      return val.sym().toString();
    case "scvString":
      return val.str().toString();
    case "scvBool":
      return val.b();
    case "scvU32":
      return val.u32();
    case "scvU64":
      return val.u64().toString();
    case "scvI128":
      return decodeI128(val).toString();
    case "scvVoid":
      return null;
    default:
      return undefined;
  }
}

/**
 * Decode a contract event's map-shaped value into a plain object keyed by
 * its field-name symbols. Returns `{}` for a non-map value (e.g. `scvVoid`)
 * rather than throwing -- the caller's schema validation surfaces that as a
 * missing-fields `ParseError` with the raw XDR attached, instead of a raw
 * XDR decode exception that would carry no such context.
 */
function decodeEventValue(value: xdr.ScVal): Record<string, unknown> {
  const map = value.map();
  if (!map) return {};

  const record: Record<string, unknown> = {};
  for (const entry of map) {
    record[entry.key().sym().toString()] = decodeScValLoosely(entry.val());
  }
  return record;
}

/**
 * Parse raw Soroban events into structured records.
 *
 * For topics this indexer has a schema for (`CONTRACT_EVENT_SCHEMAS`), the
 * decoded value is validated with Zod; a mismatch (missing field, wrong
 * shape -- e.g. from an upgraded contract ABI) throws a `ParseError`
 * carrying the event's raw XDR rather than silently building a malformed
 * `ParsedContractEvent`. Unrecognised topics are passed through with an
 * empty `data` object so an event from a not-yet-modeled contract doesn't
 * halt indexing.
 */
export function parseContractEvents(
  events: StellarRpc.Api.GetEventsResponse["events"]
): ParsedContractEvent[] {
  // `event.contractId` is only absent for the (rare) diagnostic events the
  // RPC surfaces without one; those aren't attributable to a contract and
  // can't be represented as a `ParsedContractEvent`, so they're skipped.
  return events.flatMap((event) => {
    if (event.contractId === undefined) return [];

    const firstTopic = event.topic[0];
    const topic = firstTopic ? String(firstTopic.sym()) : "unknown";

    let data: Record<string, unknown> = {};
    if (isKnownContractEventTopic(topic)) {
      const decoded = decodeEventValue(event.value);
      const result = CONTRACT_EVENT_SCHEMAS[topic].safeParse(decoded);
      if (!result.success) {
        throw new ParseError(
          `Contract event "${topic}" failed schema validation: ${result.error.message}`,
          event.value.toXDR("base64"),
          result.error
        );
      }
      data = result.data;
    }

    return [
      {
        ledgerSequence: event.ledger,
        contractId: event.contractId.contractId(),
        topic,
        value: event.value,
        txHash: event.txHash,
        data,
      },
    ];
  });
}
