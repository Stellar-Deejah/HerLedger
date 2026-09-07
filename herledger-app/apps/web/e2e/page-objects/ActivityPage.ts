import { Page, Locator } from "@playwright/test";

export class ActivityPage {
  readonly page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/dashboard/activity");
  }

  async getEventRow(eventId: string): Promise<Locator> {
    // Assuming rows can be identified by the event ID or a generic test id.
    // Playwright recommends user-facing attributes where possible.
    return this.page.locator(`tr:has-text("${eventId.slice(0, 8)}")`);
  }

  async clickEvent(eventId: string) {
    await (await this.getEventRow(eventId)).click();
  }

  async expectEventStatus(eventId: string, status: string) {
    const row = await this.getEventRow(eventId);
    await require("@playwright/test").expect(row).toContainText(status);
  }
}
