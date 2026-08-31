import { Page, Locator } from "@playwright/test";

export class DisputesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/dashboard/disputes");
  }

  async fillDisputeForm(reason: string) {
    // Navigate to a dispute form or modal, fill reason
    await this.page.getByLabel(/Reason/i).fill(reason);
  }

  async submitDispute() {
    await this.page.getByRole("button", { name: /Submit Dispute/i }).click();
  }
}
