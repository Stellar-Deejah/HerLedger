import { Page } from "@playwright/test";

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
    await this.page.getByRole("button", { name: /Submit Dispute|Submit dispute/i }).click();
  }

  async raiseDispute(_eventId: string, reason: string) {
    const challengeBtn = this.page.getByRole("button", { name: /Challenge/i }).first();
    if (await challengeBtn.isVisible()) {
      await challengeBtn.click();
    }
    await this.fillDisputeForm(reason);
    await this.submitDispute();
  }
}
