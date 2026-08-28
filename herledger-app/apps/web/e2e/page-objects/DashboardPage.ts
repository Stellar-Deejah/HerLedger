import { Page, Locator } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly activityLink: Locator;
  readonly attestationsLink: Locator;
  readonly disputesLink: Locator;
  readonly businessLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.activityLink = page.getByRole("link", { name: /Activity/i });
    this.attestationsLink = page.getByRole("link", { name: /Attestations/i });
    this.disputesLink = page.getByRole("link", { name: /Disputes/i });
    this.businessLink = page.getByRole("link", { name: /Business/i });
  }

  async goto() {
    await this.page.goto("/dashboard");
  }

  async navigateToActivity() {
    await this.activityLink.click();
  }
}
