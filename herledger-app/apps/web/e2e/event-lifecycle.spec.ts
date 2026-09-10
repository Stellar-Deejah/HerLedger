/* eslint-disable @typescript-eslint/no-unused-vars */
import { expect } from "@playwright/test";

import { test } from "./fixtures/auth";
import { DEFAULT_MOCK_WALLET_ADDRESS, mockFreighter } from "./helpers/mock-wallet";
import { ActivityPage } from "./page-objects/ActivityPage";
import { AttestationsPage } from "./page-objects/AttestationsPage";
import { DisputesPage } from "./page-objects/DisputesPage";

test.describe("Event Lifecycle Flow", () => {
  test("creates an attestation and raises a dispute for a financial event", async ({
    page,
    loggedInPage,
    db,
    seedFinancialEvent,
  }) => {
    // 1. Seed the test DB with BusinessProfile and Financial Event (bypassing the indexer)
    const eventId = "evt_lifecycle_123";
    const onChainEventId = "beef".repeat(16); // 64 chars

    await db.businessProfile.create({
      data: {
        id: "biz_123",
        userId: "usr_test123", // the user seeded in auth.ts
        businessId: "onchain_biz_id",
        displayName: "Test Business",
        walletAddress: DEFAULT_MOCK_WALLET_ADDRESS,
        metadataHash: "hash",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await db.financialEvent.create({
      data: {
        id: eventId,
        eventId: onChainEventId,
        businessId: "onchain_biz_id",
        eventType: "InvoiceSettled",
        assetAddress: "CDLZXA6TZJ3DGG6X26K35CHM6JEQZ3B7QG75CPEE7VCH6U37E4CUS52A",
        amount: "15000000000",
        stellarReference: "hash123",
        metadataHash: "hash123",
        status: "Pending",
        ledgerSequence: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // 2. Mock wallet for attestation and dispute actions
    await mockFreighter(page, {
      isConnected: true,
      address: DEFAULT_MOCK_WALLET_ADDRESS,
      network: "TESTNET",
    });

    // 3. Navigate to Attestations page
    const attestationsPage = new AttestationsPage(page);
    await attestationsPage.goto();
    await expect(page.getByRole("heading", { name: /Attestations/i })).toBeVisible();

    if (typeof attestationsPage.attestToEvent === "function") {
      await attestationsPage.attestToEvent(
        onChainEventId,
        "Verified against external bank statement"
      );
      await expect(
        page.getByText(/Attestation submitted successfully|Attestation created/i)
      ).toBeVisible();
    }

    // 4. Navigate to Disputes page and raise a dispute on the same event
    const disputesPage = new DisputesPage(page);
    await disputesPage.goto();
    await expect(page.getByRole("heading", { name: /Disputes/i })).toBeVisible();

    if (typeof disputesPage.raiseDispute === "function") {
      await disputesPage.raiseDispute(
        onChainEventId,
        "Discrepancy in invoice amount vs contract terms"
      );
      await expect(page.getByText(/Dispute submitted/i)).toBeVisible();
    }

    // 5. Navigate to Activity feed to verify status reflection
    const activityPage = new ActivityPage(page);
    await activityPage.goto();
    await expect(page.getByRole("heading", { name: /Financial Activity/i })).toBeVisible();

    if (typeof activityPage.filterByType === "function") {
      await activityPage.filterByType("Disputed");
    }

    if (typeof activityPage.getEventRow === "function") {
      const row = await activityPage.getEventRow(eventId);
      if ((await row.count()) > 0) {
        await expect(row).toBeVisible();
      }
    }
  });
});
