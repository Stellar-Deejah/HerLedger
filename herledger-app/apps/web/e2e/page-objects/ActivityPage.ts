import { Page, Locator, expect } from "@playwright/test";

export class ActivityPage {
  readonly page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/dashboard/activity");
  }

  async getEventRow(eventId: string): Promise<Locator> {
    // The table never renders the raw on-chain eventId as text (only a
    // formatted date/type/amount/status and the *stellarReference*), so a
    // text-based locator can't target a row -- use the stable test id
    // ActivityList sets on each <tr> instead.
    return this.page.locator(`[data-testid="activity-row-${eventId}"]`);
  }

  async clickEvent(eventId: string) {
    await (await this.getEventRow(eventId)).click();
  }

  async expectEventStatus(eventId: string, status: string) {
    const row = await this.getEventRow(eventId);
    await expect(row).toContainText(status);
  }
}
