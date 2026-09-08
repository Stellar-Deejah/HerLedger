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

  async fillAttestationForm(eventId: string, claim: string) {
    await this.page.getByLabel(/Event ID/i).fill(eventId);
    await this.page.getByLabel(/Claim/i).fill(claim);
  }

  async submitAttestation() {
    await this.page.getByRole("button", { name: /Submit/i }).click();
  }
}
