import "server-only";

import { getServerEnv } from "@herledger/config/server";
import { Resend } from "resend";

// ---------------------------------------------------------------------------
// Transactional email — Resend.
//
// Chosen over SendGrid for this project: a single env var (RESEND_API_KEY)
// is enough to send in development against onboarding@resend.dev with no
// domain verification step, and its SDK has no dependency on a Node
// runtime-specific transport (unlike, say, nodemailer's SMTP path), which
// keeps it compatible with Next.js's route handler runtime without extra
// config. Production sending needs a verified sending domain in the Resend
// dashboard and EMAIL_FROM set to an address on it — see .env.example.
// ---------------------------------------------------------------------------

let client: Resend | null = null;

function getResendClient(): Resend {
  client ??= new Resend(getServerEnv().RESEND_API_KEY);
  return client;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends a transactional email via Resend. Throws on failure — callers that
 * can't tolerate a hard failure (e.g. a user-facing "resend" action)
 * should catch and surface a friendly message rather than let this
 * propagate as an unhandled 500.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const env = getServerEnv();
  const result = await getResendClient().emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (result.error) {
    throw new Error(`Failed to send email via Resend: ${result.error.message}`);
  }
}
