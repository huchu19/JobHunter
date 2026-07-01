/**
 * Env-gated email transport. Follows the same layered-and-optional pattern as
 * the AI features: without RESEND_API_KEY every send is a graceful no-op that
 * reports why, so no route ever hard-fails on a missing key. With a key it
 * posts to the Resend HTTP API directly (no SDK dependency).
 *
 * ⏸️ Real delivery is unverified until a RESEND_API_KEY is provided — see
 * Milestone 6 in MILESTONES.md.
 */

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
}

export interface SendEmailResult {
  sent: boolean;
  reason?: string;
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail({
  to,
  subject,
  text,
}: SendEmailInput): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:
          process.env.EMAIL_FROM ?? "JobHunter <onboarding@resend.dev>",
        to: [to],
        subject,
        text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { sent: false, reason: `Resend ${res.status}: ${body.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "send failed",
    };
  }
}
