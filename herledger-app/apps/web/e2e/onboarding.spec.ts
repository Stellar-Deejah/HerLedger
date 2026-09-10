/* eslint-disable @typescript-eslint/no-unused-vars */
import { expect } from "@playwright/test";

import { test } from "./fixtures/auth";
import { DEFAULT_MOCK_WALLET_ADDRESS, mockFreighter } from "./helpers/mock-wallet";
import { BusinessPage } from "./page-objects/BusinessPage";
import { DashboardPage } from "./page-objects/DashboardPage";

test.describe("Business Onboarding Flow", () => {
  test("completes the full onboarding journey successfully", async ({ page, loggedInPage, db }) => {
    const testWalletAddress = DEFAULT_MOCK_WALLET_ADDRESS;

    // Inject mock Freighter wallet before navigation
    await mockFreighter(page, {
      isConnected: true,
      address: testWalletAddress,
      network: "TESTNET",
    });

    // We start logged in but with no business profile. The app should prompt to register.
    const businessPage = new BusinessPage(page);
    await businessPage.goto();

    const businessNameInput = page.getByLabel(/Business Name/i);
    const connectWalletBtn = page.getByRole("button", { name: /Connect (Wallet|Freighter)/i });

    // Wait for the form to mount: either step 1 (connect button) or step 2 (business name input)
    await expect(businessNameInput.or(connectWalletBtn)).toBeVisible({ timeout: 15000 });
    if (await connectWalletBtn.isVisible()) {
      await connectWalletBtn.click();
    }

    // Now fill out the business name (Step 4)
    await businessPage.fillRegistrationForm("My Playwright Test Business");

    // Submit registration (Step 7-9)
    await businessPage.submitRegistration();

    // App confirms registration on Stellar
    await expect(
      page.getByRole("heading", { name: /business registered on stellar/i })
    ).toBeVisible({ timeout: 15000 });

    // Navigate to dashboard to verify business display
    await page.goto("/dashboard");
    await expect(page.getByText(/My Playwright Test Business/i)).toBeVisible({ timeout: 15000 });

    // Assert that the business was saved in the DB (Step 11)
    const userBusiness = await db.businessProfile.findFirst({
      where: { walletAddress: testWalletAddress },
    });
    expect(userBusiness).toBeDefined();
    expect(userBusiness?.displayName).toBe("My Playwright Test Business");
  });
});

