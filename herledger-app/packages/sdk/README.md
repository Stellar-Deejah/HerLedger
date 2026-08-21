# @herledger/sdk

TypeScript SDK for the HerLedger protocol. Provides:

- **Wallet abstraction** — `WalletProvider` interface + `FreighterWalletProvider` adapter
- **Soroban contract clients** — BusinessRegistry, FinancialLedger, AttestationRegistry
- **Stellar RPC utilities** — failover, circuit breaker, health check
- **Encoding helpers** — Soroban XDR encode/decode

---

## Table of Contents

1. [Wallet Abstraction](#wallet-abstraction)
   - [WalletProvider interface](#walletprovider-interface)
   - [FreighterWalletProvider](#freighterwallletprovider)
   - [Implementing a custom adapter](#implementing-a-custom-adapter)
   - [useWallet hook (apps/web)](#usewallet-hook-appsweb)
2. [Contract Clients](#contract-clients)
3. [RPC Utilities](#rpc-utilities)
4. [Errors](#errors)

---

## Wallet Abstraction

### WalletProvider interface

`WalletProvider` is the core abstraction. Any wallet (Freighter, Albedo, xBull,
WalletConnect, …) must implement this interface to be usable in HerLedger
without changing call sites.

```ts
import type { WalletProvider, WalletConnection } from "@herledger/sdk";
```

#### Interface definition

```ts
interface WalletProvider {
  /**
   * Request wallet access and return the connected public key + network.
   * Throws `WalletError` if the wallet is unavailable or the user rejects.
   */
  connect(): Promise<WalletConnection>;

  /**
   * Disconnect / clear session state.
   * Implementations that have no session concept may resolve immediately.
   */
  disconnect(): Promise<void>;

  /**
   * Return the currently connected public key, or `null` if not connected.
   * Must NOT prompt the user — use `connect()` for that.
   */
  getAddress(): Promise<string | null>;

  /**
   * Sign a Stellar transaction XDR string and return the signed XDR.
   *
   * @param transactionXdr  - Base64-encoded unsigned transaction envelope.
   * @param networkPassphrase - Stellar network passphrase used during build.
   * @param accountToSign   - Optional: the specific account to sign with.
   * @throws `WalletError` if the user rejects or signing fails.
   */
  signTransaction(
    transactionXdr: string,
    networkPassphrase: string,
    accountToSign?: string
  ): Promise<string>;
}

interface WalletConnection {
  publicKey: string; // Stellar G-address
  network: string; // e.g. "TESTNET", "PUBLIC", "FUTURENET"
}
```

#### Design decisions

| Decision                         | Rationale                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| All methods are `async`          | Wallet APIs are inherently async (browser extension round-trips, hardware signing); sync wrappers would be a lie    |
| `getAddress()` never prompts     | Separates _reading cached state_ from _requesting permission_; avoids surprising the user on every render           |
| `disconnect()` is always present | Adapters like WalletConnect have real teardown logic; Freighter resolves immediately since it has no disconnect API |
| Errors use `WalletError`         | Gives callers a single catch clause; `err.message` is always user-friendly                                          |
| `accountToSign` is optional      | Most signers default to the connected account; multi-sig flows can override it                                      |

---

### FreighterWalletProvider

The default adapter. Wraps the `@stellar/freighter-api` browser extension.

```ts
import { FreighterWalletProvider, freighterWalletProvider } from "@herledger/sdk";

// Use the singleton (shared instance):
const wallet: WalletProvider = freighterWalletProvider;

// Or construct your own:
const wallet = new FreighterWalletProvider();
```

#### Extra method

`FreighterWalletProvider` adds one method beyond `WalletProvider`:

```ts
class FreighterWalletProvider implements WalletProvider {
  /**
   * Returns true if the Freighter extension is installed and accessible.
   * Does NOT prompt — safe to call silently on page load.
   */
  isAvailable(): Promise<boolean>;
}
```

#### Backward-compatible functional API

The original functional exports (`connectWallet`, `getConnectedAddress`, etc.)
are still exported as thin wrappers so existing call sites compile unchanged
while migrating to `useWallet()`. They are marked `@deprecated`.

```ts
// Deprecated — still works, use useWallet() in new code
import {
  isFreighterAvailable, // → freighterWalletProvider.isAvailable()
  connectWallet, // → freighterWalletProvider.connect()
  getConnectedAddress, // → freighterWalletProvider.getAddress()
  signTransactionWithFreighter, // → freighterWalletProvider.signTransaction()
} from "@herledger/sdk";
```

---

### Implementing a custom adapter

To add a new wallet (e.g. Albedo), implement `WalletProvider` and inject it
into `WalletContextProvider` at the app root:

```ts
// lib/wallet/albedo-provider.ts
import type { WalletProvider, WalletConnection } from "@herledger/sdk";
import { WalletError } from "@herledger/sdk";
import albedo from "@albedo-link/intent";

export class AlbedoWalletProvider implements WalletProvider {
  async connect(): Promise<WalletConnection> {
    try {
      const result = await albedo.publicKey({});
      return { publicKey: result.pubkey, network: "PUBLIC" };
    } catch (cause) {
      throw new WalletError("Albedo connection failed", cause);
    }
  }

  async disconnect(): Promise<void> {
    // Albedo has no session — nothing to do
  }

  async getAddress(): Promise<string | null> {
    // Albedo doesn't persist state — return null until connect() is called
    return null;
  }

  async signTransaction(xdr: string, networkPassphrase: string): Promise<string> {
    try {
      const result = await albedo.tx({ xdr, network: "public" });
      return result.signed_envelope_xdr;
    } catch (cause) {
      throw new WalletError("Albedo signing failed", cause);
    }
  }
}
```

Then inject it into the provider:

```tsx
// app/layout.tsx
import { WalletContextProvider } from "@/lib/wallet/context";
import { AlbedoWalletProvider } from "@/lib/wallet/albedo-provider";

const albedoProvider = new AlbedoWalletProvider();

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <WalletContextProvider provider={albedoProvider}>{children}</WalletContextProvider>
      </body>
    </html>
  );
}
```

No other code in `apps/web` needs to change — components consume wallet state
via `useWallet()`, not the adapter directly.

---

### useWallet hook (apps/web)

`useWallet()` is the single access point for all wallet state in `apps/web`
components. It reads from `WalletContext` (mounted by `WalletContextProvider`
in `app/layout.tsx`).

```tsx
import { useWallet } from "@/hooks/use-wallet";

function MyComponent() {
  const {
    address, // string | null — connected Stellar G-address
    isConnected, // boolean — true when address is non-null
    isConnecting, // boolean — true while connect() is in flight
    error, // string | null — last connection error
    provider, // WalletProvider — the active adapter instance
    connect, // () => Promise<void> — request wallet access
    disconnect, // () => Promise<void> — clear wallet state
    signTransaction, // (xdr, passphrase, account?) => Promise<string>
  } = useWallet();
}
```

#### Account-change detection

`WalletContextProvider` polls `provider.getAddress()` every **2 seconds**.
When the connected account changes in Freighter (or any other adapter), the
context updates within 2 s and all `useWallet()` consumers re-render
automatically.

This polling approach is used because Freighter does not expose a stable
cross-browser event for account switches. The 2-second interval satisfies the
acceptance criterion (≤ 2 s detection latency).

#### Stale-closure safety

The polling callback reads the current address through a `useRef` mirror
(`addressRef`) rather than a closure over the state variable. This ensures the
comparison is always against the latest value, not a captured snapshot.

#### Caching

The connected address is cached in context. Components reading `address` from
`useWallet()` do not issue extra Freighter API calls — only the polling interval
does, once every 2 seconds, regardless of how many components are mounted.

---

## Contract Clients

Each client function takes a `StellarNetworkConfig` and `ContractConfig`:

```ts
import {
  registerBusiness,
  getBusiness,
  recordFinancialEvent,
  disputeFinancialEvent,
  createAttestation,
} from "@herledger/sdk";
```

See the generated ABI types in `src/contracts/__generated__/` for the full
parameter and return shapes.

---

## RPC Utilities

```ts
import {
  getSorobanRpcServer, // returns the active rpc.Server instance
  withRpcFailover, // retry callback across multiple RPC endpoints
  checkRpcHealth, // health check with per-endpoint circuit state
  getLatestLedger, // current ledger sequence
} from "@herledger/sdk";
```

Failover uses a circuit breaker per endpoint (5 failures → OPEN; 30s reset
timeout by default). Configure via `configureCircuitBreaker()`.

---

## Errors

All SDK errors extend `Error` and carry a `kind` discriminant:

```ts
import {
  WalletError, // wallet unavailable / user rejected
  RpcError, // Stellar RPC failure
  ContractError, // Soroban contract error
  ValidationError, // input validation failure
  AuthenticationError, // auth failure
} from "@herledger/sdk";

try {
  await wallet.signTransaction(xdr, passphrase);
} catch (err) {
  if (err instanceof WalletError) {
    console.error("Wallet error:", err.message);
  }
}
```
