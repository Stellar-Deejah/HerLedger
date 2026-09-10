import { Page, Locator } from "@playwright/test";

export class AttestationsPage {
  readonly page: Page;
  readonly createAttestationButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createAttestationButton = page.getByRole("button", { name: /Create Attestation/i });
  }

  async goto() {
    await this.page.goto("/dashboard/attestations");
  }
}
