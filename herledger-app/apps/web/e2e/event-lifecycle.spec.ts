import { test } from "./fixtures/auth";
import { mockFreighter } from "./helpers/mock-wallet";
import { ActivityPage } from "./page-objects/ActivityPage";
import { AttestationsPage } from "./page-objects/AttestationsPage";
import { DisputesPage } from "./page-objects/DisputesPage";

test.describe("Event Lifecycle Flow", () => {
  test("creates an attestation and raises a dispute for a financial event", async ({ page, loggedInPage: _loggedInPage, db, seedFinancialEvent }) => {
    // 1. Seed the test DB with a Financial Event (bypassing the indexer)
    const eventId = "evt_lifecycle_123";
    const onChainEventId = "beef".repeat(16); // 64 chars
    
    // Also seed the BusinessProfile since the user must be registered to see events
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
      }
    });

    await seedFinancialEvent({
      id: eventId,
      eventId: onChainEventId,
      businessId: "onchain_biz_id",
      status: "Verified", // Start as Verified so it can be disputed
    });

    await mockFreighter(page, {
      isConnected: true,
      address: "GBSOMEBUSINESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      network: "TESTNET",
    });

    // 2. Navigate to Activity page and verify event is visible
    const activityPage = new ActivityPage(page);
    await activityPage.goto();
    await activityPage.expectEventStatus(onChainEventId, "Verified");

    // 3. Create an Attestation
    const attestationsPage = new AttestationsPage(page);
    await attestationsPage.goto();
    
    // Simulate creating attestation
    await attestationsPage.createAttestationButton.click();
    await attestationsPage.fillAttestationForm(onChainEventId, "Payment was for services rendered.");
    await attestationsPage.submitAttestation();

    // 4. Raise a dispute
    const disputesPage = new DisputesPage(page);
    await disputesPage.goto();
    await disputesPage.fillDisputeForm("Incorrect amount recognized.");
    await disputesPage.submitDispute();

    // The mock wallet intercepts the `FinancialLedger.dispute_event()` tx and succeeds.
    // Assuming the app updates the DB or optimistic UI to Disputed:
    
    // 5. Assert final EventStatus in UI
    await activityPage.goto();
    await activityPage.expectEventStatus(onChainEventId, "Disputed");
  });
});
