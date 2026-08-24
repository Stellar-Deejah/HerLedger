import "server-only";

import { sendEmail } from "./resend";

export async function sendVerificationEmail(to: string, url: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Verify your HerLedger email address",
    text: `Verify your email to finish setting up your HerLedger account:\n\n${url}\n\nIf you didn't create a HerLedger account, you can ignore this email.`,
    html: `
      <p>Verify your email to finish setting up your HerLedger account.</p>
      <p><a href="${url}">Verify email address</a></p>
      <p style="color:#6b7280;font-size:0.875rem;">If you didn't create a HerLedger account, you can ignore this email.</p>
    `.trim(),
  });
}
