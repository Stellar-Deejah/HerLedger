import { Page, Locator } from "@playwright/test";

export class BusinessPage {
  readonly page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/dashboard/business");
  }

  async fillRegistrationForm(businessName: string) {
    await this.page.getByLabel(/Business Name/i).fill(businessName);
  }

  async submitRegistration() {
    await this.page.getByRole("button", { name: /Register/i }).click();
  }
}
