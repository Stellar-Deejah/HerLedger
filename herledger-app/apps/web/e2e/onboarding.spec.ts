import { expect } from "@playwright/test";
import { test } from "./fixtures/auth";
import { mockFreighter } from "./helpers/mock-wallet";
import { DashboardPage } from "./page-objects/DashboardPage";
import { BusinessPage } from "./page-objects/BusinessPage";

test.describe("Business Onboarding Flow", () => {
  test("completes the full onboarding journey successfully", async ({ page, loggedInPage, db }) => {
    // Inject mock Freighter wallet before navigation
    await mockFreighter(page, {
      isConnected: true,
      address: "GBSOMEBUSINESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      network: "TESTNET",
      signTransactionXdr: "AAAA...",
    });

    // We start logged in but with no business profile. The app should prompt to register.
    const businessPage = new BusinessPage(page);
    await businessPage.goto();

    // The user should see a Connect Wallet button or prompt if they haven't connected
    const connectWalletBtn = page.getByRole("button", { name: /Connect Wallet/i });
    if (await connectWalletBtn.isVisible()) {
      await connectWalletBtn.click();
    }

    // Now fill out the business name (Step 4)
    await businessPage.fillRegistrationForm("My Playwright Test Business");

    // Intercept the API call where the app checks confirmation or saves the profile.
    // Assuming the app has an endpoint for finishing registration or polling.
    // If it relies purely on the Soroban RPC mock we set up in mockFreighter, it should pass.
    
    // Submit registration (Step 7-9)
    await businessPage.submitRegistration();

    // App should poll for confirmation and then redirect to dashboard (Step 10-12)
    // Wait for URL to be the dashboard
    await page.waitForURL("**/dashboard*");

    const dashboardPage = new DashboardPage(page);
    await expect(page.getByText(/My Playwright Test Business/i)).toBeVisible({ timeout: 15000 });

    // Assert that the business was saved in the DB (Step 11)
    const userBusiness = await db.businessProfile.findFirst({
      where: { walletAddress: "GBSOMEBUSINESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }
    });
    expect(userBusiness).toBeDefined();
    expect(userBusiness?.name).toBe("My Playwright Test Business");
  });
});
