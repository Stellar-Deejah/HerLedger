import { Page } from "@playwright/test";

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
    address = "GACTIVEATTESTERADDRESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    network = "TESTNET",
    signTransactionXdr = "AAAAAgAAAAA...",
    interceptRpc = true,
  } = options;

  // 1. Inject the mocked window.freighter API
  await page.addInitScript(
    (mockOpts) => {
      (window as any).freighter = {
        isConnected: async () => ({ isConnected: mockOpts.isConnected }),
        requestAccess: async () => {
          if (!mockOpts.isConnected) {
            return { error: "User declined access" };
          }
          return { address: mockOpts.address };
        },
        getAddress: async () => ({ address: mockOpts.address }),
        getNetwork: async () => ({ network: mockOpts.network }),
        signTransaction: async (xdr: string) => ({ signedTxXdr: mockOpts.signTransactionXdr }),
      };
    },
    { isConnected, address, network, signTransactionXdr }
  );

  // 2. Intercept Soroban RPC / Stellar Horizon calls if enabled
  if (interceptRpc) {
    await page.route(/soroban.*stellar.*rpc/i, async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        const postData = request.postDataJSON();
        // Mock getTransaction to return success for polling
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
                envelopeXdr: "AAAA...",
                resultMetaXdr: "AAAA...",
              },
            }),
          });
          return;
        }

        // Mock sendTransaction to return a pending status
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
              },
            }),
          });
          return;
        }

        // Mock getNetwork
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

        // Fallback successful response for other RPC methods
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ jsonrpc: "2.0", id: postData.id, result: {} }),
        });
        return;
      }
      await route.continue();
    });
  }
}
