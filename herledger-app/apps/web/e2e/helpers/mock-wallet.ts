import { Page } from "@playwright/test";

import {
  emptyTransactionMetaXdr,
  successfulTransactionResultXdr,
  throwawayEnvelopeXdr,
} from "./soroban-rpc-fixtures";

export const DEFAULT_MOCK_WALLET_ADDRESS =
  "GCVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVH7N";

export interface MockFreighterOptions {
  isConnected?: boolean;
  address?: string;
  network?: string;
  signTransactionXdr?: string;
  interceptRpc?: boolean;
}

export async function mockFreighter(page: Page, options: MockFreighterOptions = {}) {
  const {
    isConnected = true,
    address = DEFAULT_MOCK_WALLET_ADDRESS,
    network = "TESTNET",
    signTransactionXdr = throwawayEnvelopeXdr(),
    interceptRpc = true,
  } = options;

  // 1. Inject the mocked window.freighter API and window.postMessage protocol
  await page.addInitScript(
    (mockOpts) => {
      // Legacy window.freighter object
      (window as unknown as Record<string, unknown>).freighter = {
        isConnected: async () => ({ isConnected: mockOpts.isConnected }),
        requestAccess: async () => {
          if (!mockOpts.isConnected) {
            return { error: "User declined access" };
          }
          return { address: mockOpts.address };
        },
        getAddress: async () => ({ address: mockOpts.address }),
        getNetwork: async () => ({ network: mockOpts.network }),
        signTransaction: async (xdr: string) => ({
          signedTxXdr: mockOpts.signTransactionXdr ?? xdr,
        }),
      };

      // @stellar/freighter-api message protocol listener
      window.addEventListener("message", (event) => {
        if (event.source !== window || event.data?.source !== "FREIGHTER_EXTERNAL_MSG_REQUEST") {
          return;
        }

        const { messageId, transactionXdr } = event.data;
        const reply: Record<string, unknown> = {
          source: "FREIGHTER_EXTERNAL_MSG_RESPONSE",
          messageId,
          // Note: @stellar/freighter-api v6 has a known typo checking `messagedId`
          messagedId: messageId,
          isConnected: mockOpts.isConnected,
          publicKey: mockOpts.address,
          address: mockOpts.address,
          network: mockOpts.network ?? "TESTNET",
          networkDetails: {
            network: mockOpts.network ?? "TESTNET",
            networkName: mockOpts.network ?? "TESTNET",
            networkUrl: "https://horizon-testnet.stellar.org",
            networkPassphrase: "Test SDF Network ; September 2015",
            sorobanRpcUrl: "https://soroban-testnet.stellar.org",
          },
          signedTransaction: transactionXdr ?? mockOpts.signTransactionXdr,
          signedTxXdr: transactionXdr ?? mockOpts.signTransactionXdr,
          signerAddress: mockOpts.address,
        };

        window.postMessage(reply, window.location.origin);
      });
    },
    { isConnected, address, network, signTransactionXdr }
  );

  // 2. Intercept Soroban RPC / Stellar Horizon calls if enabled
  if (interceptRpc) {
    await page.route(/soroban|stellar/i, async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        let postData: { id?: unknown; method?: string } | null = null;
        try {
          postData = request.postDataJSON() as { id?: unknown; method?: string };
        } catch {
          postData = null;
        }

        if (postData?.method === "simulateTransaction") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: postData.id,
              result: {
                minResourceFee: "100",
                transactionData: "AAAAAAAAAAAAAAAAAAAAZAAAAGQAAABkAAAAAAAAAGQ=",
                results: [{ auth: [] }],
                latestLedger: 1000,
              },
            }),
          });
          return;
        }

        if (postData?.method === "getTransaction") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: postData.id,
              result: {
                status: "SUCCESS",
                txHash: "mocked_tx_hash",
                latestLedger: 1000,
                latestLedgerCloseTime: "1700000000",
                oldestLedger: 1,
                oldestLedgerCloseTime: "1699999000",
                ledger: 1000,
                createdAt: "1699999900",
                applicationOrder: 1,
                feeBump: false,
                envelopeXdr: throwawayEnvelopeXdr(),
                resultXdr: successfulTransactionResultXdr(),
                resultMetaXdr: emptyTransactionMetaXdr(),
              },
            }),
          });
          return;
        }

        if (postData?.method === "sendTransaction") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: postData.id,
              result: {
                status: "PENDING",
                hash: "mocked_tx_hash",
                latestLedger: 1000,
              },
            }),
          });
          return;
        }

        if (postData?.method === "getNetwork") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: postData.id,
              result: { passphrase: "Test SDF Network ; September 2015" },
            }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ jsonrpc: "2.0", id: postData?.id, result: {} }),
        });
        return;
      }
      await route.continue();
    });
  }
}
