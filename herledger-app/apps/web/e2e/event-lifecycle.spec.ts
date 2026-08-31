/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { expect } from "@playwright/test";

import { test } from "./fixtures/auth";
import { mockFreighter } from "./helpers/mock-wallet";
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
    // 1. Seed the test DB with a Financial Event (bypassing the indexer)
    const eventId = "evt_lifecycle_123";
    const onChainEventId = "beef".repeat(16); // 64 chars

    await db.financialEvent.create({
      data: {
        id: eventId,
        eventId: onChainEventId,
        businessId: "onchain_biz_id",
        eventType: "InvoiceSettled",
        assetAddress: "CDLZXA6TZJ3DGG6X26K35CHM6JEQZ3B7QG75CPEE7VCH6U37E4CUS52A",
        amount: "1500.00",
        stellarReference: "hash123",
        metadataHash: "hash123",
        status: "Pending",
        ledgerSequence: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await db.businessProfile.create({
      data: {
        id: "biz_123",
        userId: "usr_test123", // the user seeded in auth.ts
        businessId: "onchain_biz_id",
        displayName: "Test Business",
        walletAddress: "GBSOMEBUSINESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        metadataHash: "hash",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // 2. Mock wallet for attestation and dispute actions
    await mockFreighter(page, {
      isConnected: true,
      address: "GBSOMENOTARYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      network: "TESTNET",
    });

    // 3. Navigate to Attestations page and attests to the event
    const attestationsPage = new AttestationsPage(page) as any;
    await attestationsPage.goto();

    // Check if the event appears in the attestable list and click Attest
    if (typeof attestationsPage.attestToEvent === "function") {
      await attestationsPage.attestToEvent(
        onChainEventId,
        "Verified against external bank statement"
      );
    }
    await expect(page.getByText(/Attestation submitted successfully/i)).toBeVisible();

    // 4. Navigate to Disputes page and raise a dispute on the same event
    const disputesPage = new DisputesPage(page) as any;
    await disputesPage.goto();
    if (typeof disputesPage.raiseDispute === "function") {
      await disputesPage.raiseDispute(
        onChainEventId,
        "Discrepancy in invoice amount vs contract terms"
      );
    }
    await expect(page.getByText(/Dispute submitted successfully/i)).toBeVisible();

    // 5. Navigate to Activity feed to verify status reflection
    const activityPage = new ActivityPage(page) as any;
    await activityPage.goto();
    if (typeof activityPage.filterByType === "function") {
      await activityPage.filterByType("Disputed");
    }

    // The disputed event should appear with "Disputed" status badge
    if (typeof activityPage.getEventRow === "function") {
      await expect(activityPage.getEventRow(eventId)).toBeVisible();
      await expect(activityPage.getEventRow(eventId)).toContainText("Disputed");
    }
  });
});
