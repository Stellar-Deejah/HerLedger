/**
 * XDR fixtures for every HerLedger contract event's data payload.
 *
 * Each `valueXdrBase64` is the base64 XDR of the event's `value` field, as
 * `#[contractevent]` (soroban-sdk) would publish it: an `ScVal` map keyed by
 * the struct's field-name symbols (see `event-schemas.ts` for why). They
 * were generated with the Stellar SDK's own `ScVal` builders against the
 * exact field lists in `herledger-contract/contracts/*\/src/lib.rs` --
 * *not* captured from a live testnet deployment. No HerLedger contract
 * instance is deployed to testnet in this environment to capture from; if
 * one becomes available, these can be regenerated (or supplemented) from a
 * real `getEvents` response using the same shape asserted here.
 *
 * `parseContractEvents` doesn't care where the bytes came from -- it decodes
 * XDR and validates the result, so these fixtures exercise the exact same
 * code path a testnet-captured one would.
 */

export const BUSINESS_ID = "1".repeat(64);
export const EVENT_ID = "2".repeat(64);
export const ATTESTATION_ID = "3".repeat(64);
export const REASON_HASH = "4".repeat(64);

export const OWNER = "GASG5EOMAVDS4ANN4CBPCAVXHTYC3MN4SCE5ZGQ72RMTLKNPTZT6JGS3";
export const WALLET = "GDBOCARUIXMKYQMF6UND56BHP5LNMMWX5K4J4SPO3P7AXSDWMTX3QZQJ";
export const ATTESTER = "GD7IGJSOKEWUZDJB2KKVLDK2B7CUCV53Q37XPWHMGKTUTW63FRFEC4HZ";
export const ASSET = "CADQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQP5KR";

export interface ContractEventFixture {
  /** Base64 XDR of the event's `value` field. */
  valueXdrBase64: string;
  /** The exact decoded + validated object `parseContractEvents` should produce. */
  expected: Record<string, unknown>;
}

export const CONTRACT_EVENT_FIXTURES: Record<string, ContractEventFixture> = {
  SupportedAssetAdded: {
    valueXdrBase64:
      "AAAAEQAAAAEAAAABAAAADwAAAAVhc3NldAAAAAAAABIAAAABBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=",
    expected: { asset: ASSET },
  },
  SupportedAssetRemoved: {
    valueXdrBase64:
      "AAAAEQAAAAEAAAABAAAADwAAAAVhc3NldAAAAAAAABIAAAABBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=",
    expected: { asset: ASSET },
  },
  FinancialEventRecorded: {
    valueXdrBase64:
      "AAAAEQAAAAEAAAACAAAADwAAAAhldmVudF9pZAAAAA0AAAAgIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIAAAAPAAAAC2J1c2luZXNzX2lkAAAAAA0AAAAgERERERERERERERERERERERERERERERERERERERERERE=",
    expected: { event_id: EVENT_ID, business_id: BUSINESS_ID },
  },
  FinancialEventVerified: {
    valueXdrBase64:
      "AAAAEQAAAAEAAAACAAAADwAAAAhldmVudF9pZAAAAA0AAAAgIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIAAAAPAAAAC2J1c2luZXNzX2lkAAAAAA0AAAAgERERERERERERERERERERERERERERERERERERERERERE=",
    expected: { event_id: EVENT_ID, business_id: BUSINESS_ID },
  },
  FinancialEventDisputed: {
    valueXdrBase64:
      "AAAAEQAAAAEAAAADAAAADwAAAAhldmVudF9pZAAAAA0AAAAgIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIAAAAPAAAAC2J1c2luZXNzX2lkAAAAAA0AAAAgEREREREREREREREREREREREREREREREREREREREREREAAAAPAAAAC3JlYXNvbl9oYXNoAAAAAA0AAAAgREREREREREREREREREREREREREREREREREREREREREQ=",
    expected: { event_id: EVENT_ID, business_id: BUSINESS_ID, reason_hash: REASON_HASH },
  },
  FinancialEventRevoked: {
    valueXdrBase64:
      "AAAAEQAAAAEAAAADAAAADwAAAAhldmVudF9pZAAAAA0AAAAgIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIAAAAPAAAAC2J1c2luZXNzX2lkAAAAAA0AAAAgEREREREREREREREREREREREREREREREREREREREREREAAAAPAAAAC3JlYXNvbl9oYXNoAAAAAA0AAAAgREREREREREREREREREREREREREREREREREREREREREQ=",
    expected: { event_id: EVENT_ID, business_id: BUSINESS_ID, reason_hash: REASON_HASH },
  },
  BusinessRegistered: {
    valueXdrBase64:
      "AAAAEQAAAAEAAAADAAAADwAAAAtidXNpbmVzc19pZAAAAAANAAAAIBERERERERERERERERERERERERERERERERERERERERERAAAADwAAAAVvd25lcgAAAAAAABIAAAAAAAAAACRukcwFRy4BreCC8QK3PPAtsbyQidyaH9RZNamvnmfkAAAADwAAAAZ3YWxsZXQAAAAAABIAAAAAAAAAAMLhAjRF2KxBhfUaPvgnf1bWMtfquJ5J7tv+C8h2ZO+4",
    expected: { business_id: BUSINESS_ID, owner: OWNER, wallet: WALLET },
  },
  BusinessMetadataUpdated: {
    valueXdrBase64:
      "AAAAEQAAAAEAAAACAAAADwAAAAtidXNpbmVzc19pZAAAAAANAAAAIBERERERERERERERERERERERERERERERERERERERERERAAAADwAAAAVvd25lcgAAAAAAABIAAAAAAAAAACRukcwFRy4BreCC8QK3PPAtsbyQidyaH9RZNamvnmfk",
    expected: { business_id: BUSINESS_ID, owner: OWNER },
  },
  BusinessDeactivated: {
    valueXdrBase64:
      "AAAAEQAAAAEAAAACAAAADwAAAAtidXNpbmVzc19pZAAAAAANAAAAIBERERERERERERERERERERERERERERERERERERERERERAAAADwAAAAVvd25lcgAAAAAAABIAAAAAAAAAACRukcwFRy4BreCC8QK3PPAtsbyQidyaH9RZNamvnmfk",
    expected: { business_id: BUSINESS_ID, owner: OWNER },
  },
  AttesterRegistered: {
    valueXdrBase64:
      "AAAAEQAAAAEAAAABAAAADwAAAAhhdHRlc3RlcgAAABIAAAAAAAAAAP6DJk5RLUyNIdKVVY1aD8VBV7uG/3fY7DKnSdvbLEpB",
    expected: { attester: ATTESTER },
  },
  AttesterDeactivated: {
    valueXdrBase64:
      "AAAAEQAAAAEAAAABAAAADwAAAAhhdHRlc3RlcgAAABIAAAAAAAAAAP6DJk5RLUyNIdKVVY1aD8VBV7uG/3fY7DKnSdvbLEpB",
    expected: { attester: ATTESTER },
  },
  AttestationCreated: {
    valueXdrBase64:
      "AAAAEQAAAAEAAAADAAAADwAAAA5hdHRlc3RhdGlvbl9pZAAAAAAADQAAACAzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMwAAAA8AAAAIZXZlbnRfaWQAAAANAAAAICIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiAAAADwAAAAhhdHRlc3RlcgAAABIAAAAAAAAAAP6DJk5RLUyNIdKVVY1aD8VBV7uG/3fY7DKnSdvbLEpB",
    expected: { attestation_id: ATTESTATION_ID, event_id: EVENT_ID, attester: ATTESTER },
  },
  AttestationRevoked: {
    valueXdrBase64:
      "AAAAEQAAAAEAAAADAAAADwAAAA5hdHRlc3RhdGlvbl9pZAAAAAAADQAAACAzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMwAAAA8AAAAIZXZlbnRfaWQAAAANAAAAICIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiAAAADwAAAAtyZWFzb25faGFzaAAAAAANAAAAIERERERERERERERERERERERERERERERERERERERERERE",
    expected: { attestation_id: ATTESTATION_ID, event_id: EVENT_ID, reason_hash: REASON_HASH },
  },
};

/**
 * `FinancialEventRecorded` with `business_id` missing entirely -- models a
 * contract upgrade that drops or renames a field. Used to assert that
 * `parseContractEvents` throws `ParseError` (with this raw XDR attached)
 * instead of building a domain object with an undefined `business_id`.
 */
export const MALFORMED_FINANCIAL_EVENT_RECORDED_XDR_BASE64 =
  "AAAAEQAAAAEAAAABAAAADwAAAAhldmVudF9pZAAAAA0AAAAgIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiI=";
