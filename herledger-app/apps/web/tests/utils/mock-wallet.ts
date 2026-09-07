// `Account` (from @stellar/stellar-sdk, used inside useRegistrationFlow's
// submit()) validates its accountId via StrKey.decodeEd25519PublicKey —
// checksum and all — not just a "starts with G, 56 chars" format check.
// A hand-typed placeholder like "GABC123TESTWALLET" fails that validation
// and throws "accountId is invalid" before a test's mocked SDK call is ever
// reached.
//
// Generating a *real* keypair at runtime (Keypair.random()) doesn't work
// here either: under jsdom, @stellar/stellar-sdk's ed25519 key generation
// (via @noble/ed25519) throws "expected Uint8Array of length 32, got
// type=object" — a known class of cross-realm TypedArray bug, where a
// Uint8Array produced by Node's crypto layer isn't recognized as a
// Uint8Array instance inside jsdom's separate realm.
//
// We don't actually need a *real* curve point, though —
// StrKey.decodeEd25519PublicKey only checks the version byte, length, and
// CRC16-XMODEM checksum, not that the payload is a valid ed25519 point. So
// this is a hand-encoded StrKey address (version byte 0x30 + 32 filler
// bytes + correct checksum, base32-encoded per RFC4648) built with plain
// arithmetic, no crypto library involved, and reproducible in any
// environment.
export const TEST_WALLET_ADDRESS = "GCVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVH7N";

// ---------------------------------------------------------------------------
// Shared mutable connection flag for the mocked WalletConnect used in
// component tests.
//
// BusinessRegistrationForm only renders WalletConnect while
// step is "wallet" or "details" — it unmounts entirely during "error" and
// remounts fresh on retry(). The *real* WalletConnect calls
// getConnectedAddress() on mount and silently re-fires onConnected if
// Freighter is still connected, so a remount doesn't ask the user to
// reconnect. A stateless test double can't represent that — it would just
// show the "Connect" button again on every remount, which is a false
// negative for a test asserting the connection survives error -> retry.
//
// This flag lives here (not inside the vi.mock() factory closure) so a
// test file's beforeEach can reset it between tests; the mocked module
// itself is only instantiated once per test file.
// ---------------------------------------------------------------------------
export const mockWalletConnectionState = { connected: false };

export function resetMockWalletConnectionState() {
  mockWalletConnectionState.connected = false;
}
