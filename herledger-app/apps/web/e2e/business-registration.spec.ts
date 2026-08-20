import { test as base, expect, type Page } from "@playwright/test";
import { TransactionBuilder, Keypair, Networks, Operation, Account } from "@stellar/stellar-sdk";

import {
  addSessionCookie,
  cleanupSeed,
  disconnectSeedClient,
  seedAuthenticatedUser,
} from "./helpers/seed";
import {
  emptyTransactionMetaXdr,
  successfulTransactionResultXdr,
} from "./helpers/soroban-rpc-fixtures";

// ---------------------------------------------------------------------------
// Covers the #14 recovery flow for BusinessRegistrationForm:
//
//   - resume-on-reload: a PendingRegistration left in localStorage by a
//     session that closed mid-submitAndWait resumes polling on the *next*
//     load and completes the registration, without re-signing anything.
//
// Deliberately out of scope here: a full happy-path run through Freighter
// signing and Soroban's simulate/submit RPC calls. Reproducing those
// faithfully would mean either a hand-built mock of Freighter's
// window.postMessage protocol (undocumented, brittle across
// @stellar/freighter-api versions) or hand-built XDR for a real simulated
// transaction result -- both high-maintenance for what the component/hook
// unit suites (business-registration-form.test.tsx,
// use-registration-flow.test.tsx) already cover via the useSdk() seam.
// The resume path specifically only needs pollTransactionStatus (a single
// getTransaction RPC call) and the DB POST, which is what's exercised here
// against a real seeded Postgres row -- no Freighter mock needed since
// resume never re-signs.
// ---------------------------------------------------------------------------

const PENDING_REGISTRATION_KEY = "herledger:pending-registration";

interface Fixtures {
  seededUser: { userId: string };
}

const test = base.extend<Fixtures>({
  seededUser: async ({ context, baseURL }, provide) => {
    const { userId, sessionToken } = await seedAuthenticatedUser();
    await addSessionCookie(context, sessionToken, baseURL ?? "http://localhost:3000");
    await provide({ userId });
    await cleanupSeed(userId);
  },
});

test.afterAll(async () => {
  await disconnectSeedClient();
});

/** Any structurally-valid signed transaction envelope XDR -- resume never reads its contents. */
function throwawayEnvelopeXdr(): string {
  const account = new Account(Keypair.random().publicKey(), "0");
  const tx = new TransactionBuilder(account, { fee: "100", networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.bumpSequence({ bumpTo: "1" }))
    .setTimeout(30)
    .build();
  return tx.toEnvelope().toXDR("base64");
}

/** Stubs the Soroban RPC's getTransaction call to report the given hash as confirmed. */
async function mockGetTransactionSuccess(page: Page, hash: string) {
  await page.route(/soroban|stellar.*rpc/i, async (route) => {
    const body = route.request().postDataJSON() as { id: unknown; method?: string };
    if (body?.method !== "getTransaction") {
      await route.abort("connectionrefused");
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: body.id,
        result: {
          status: "SUCCESS",
          latestLedger: 5000,
          latestLedgerCloseTime: "1700000000",
          oldestLedger: 1,
          oldestLedgerCloseTime: "1699999000",
          ledger: 4990,
          createdAt: "1699999900",
          applicationOrder: 1,
          feeBump: false,
          envelopeXdr: throwawayEnvelopeXdr(),
          resultXdr: successfulTransactionResultXdr(),
          resultMetaXdr: emptyTransactionMetaXdr(),
          txHash: hash,
        },
      }),
    });
  });
}

test.describe("Business registration — resume on reload", () => {
  test("a registration left pending in localStorage resumes and reaches confirmed on the next load", async ({
    page,
    context,
    seededUser: _seededUser,
  }) => {
    const pending = {
      businessId: "b".repeat(64),
      walletAddress: "G" + "B".repeat(55),
      displayName: "Resumed Traders",
      metadataHash: "c".repeat(64),
      txHash: "d".repeat(64),
      submittedAt: new Date().toISOString(),
    };

    // Seed the pending-registration localStorage entry via addInitScript so
    // it's present before the app's own top-level code runs on every
    // navigation in this context -- simulating "the tab was closed
    // mid-registration and the browser (or the user) reopened it."
    await context.addInitScript(
      (entry) => {
        window.localStorage.setItem(entry.key, JSON.stringify(entry.value));
      },
      { key: PENDING_REGISTRATION_KEY, value: pending }
    );

    await mockGetTransactionSuccess(page, pending.txHash);

    await page.goto("/dashboard/business");

    await expect(page.getByText(/business registered on stellar/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(pending.txHash)).toBeVisible();

    // The resume path's DB POST (POST /api/business/register) hits the real
    // app route against the seeded Postgres -- confirm the record actually
    // landed, not just that the UI shows "confirmed".
    await expect
      .poll(async () => {
        const res = await page.request.get("/api/business/current");
        if (!res.ok()) return null;
        const json = (await res.json()) as { data: { id: string } | null };
        return json.data?.id ?? null;
      })
      .toBe(pending.businessId);

    // localStorage should be cleared once the resume completes, so a
    // further reload doesn't try to resume the same (already-registered)
    // record again.
    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      PENDING_REGISTRATION_KEY
    );
    expect(stored).toBeNull();
  });
});
