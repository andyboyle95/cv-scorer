import type { GeneratedJobSpec } from "./job-spec-schema";
import {
  ACCOUNT_VOLUMES,
  INDUSTRIES,
  JOB_FUNCTIONS,
  SENIORITIES,
  labelFor,
  type JobSpecAnswers,
} from "./job-spec-config";

// Emails the generated spec via the Resend REST API.
//
// Configured via env vars (set these in Render → Environment):
//   RESEND_API_KEY          — Resend API key. No fallback: if this is unset,
//                             nothing is sent and the Lead row records why.
//   LEAD_FROM_EMAIL         — verified sender on a domain you own in Resend,
//                             e.g. "Aaron Wallis Job Spec <noreply@aaronwallis.co.uk>"
//   LEAD_NOTIFICATION_EMAIL — where leads land. Comma-separated for several.
//
// Two emails are attempted per submission:
//   1. Lead notification → LEAD_NOTIFICATION_EMAIL (full details + spec)
//   2. A copy of the spec → the person who filled in the form
//
// IMPORTANT: both of those require a VERIFIED DOMAIN in Resend. Resend's
// shared test sender (onboarding@resend.dev) will only ever deliver to the
// email address that owns the Resend account — every other recipient is
// rejected with a 403. That is the single most common reason leads "vanish",
// so isTestSender() is surfaced all the way up to the admin dashboard.

const PHONE = "01908 061 400";
const RESEND_TEST_SENDER = "onboarding@resend.dev";

/** Per-recipient outcome, persisted onto the Lead row. */
export type DeliveryStatus = "sent" | "failed" | "skipped";

export interface DeliveryResult {
  status: DeliveryStatus;
  error?: string;
}

export interface LeadEmailResult {
  notification: DeliveryResult;
  copy: DeliveryResult;
}

export interface LeadEmailConfig {
  hasApiKey: boolean;
  from: string;
  /** True when falling back to Resend's shared test sender — delivery to
   *  anyone but the Resend account owner WILL fail. */
  isTestSender: boolean;
  notify: string[];
  /** Human-readable list of problems; empty means the config looks sane. */
  problems: string[];
}

/** Reads the mail config without sending anything. Used by the admin
 *  dashboard so misconfiguration is visible before a lead is lost. */
export function getLeadEmailConfig(): LeadEmailConfig {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const from = process.env.LEAD_FROM_EMAIL?.trim() || `Job Spec Creator <${RESEND_TEST_SENDER}>`;
  const notify = parseRecipients(
    process.env.LEAD_NOTIFICATION_EMAIL || "info@aaronwallis.co.uk"
  );
  const isTestSender = from.includes(RESEND_TEST_SENDER);

  const problems: string[] = [];
  if (!apiKey) {
    problems.push(
      "RESEND_API_KEY is not set — no lead emails are being sent at all."
    );
  }
  if (isTestSender) {
    problems.push(
      "LEAD_FROM_EMAIL is not set, so we fall back to Resend's shared test " +
        "sender (onboarding@resend.dev). Resend only delivers from that " +
        "address to the email that owns the Resend account — every other " +
        "recipient is rejected. Verify a domain in Resend and set " +
        "LEAD_FROM_EMAIL to an address on it."
    );
  }
  if (!notify.length) {
    problems.push("LEAD_NOTIFICATION_EMAIL resolved to no valid recipients.");
  }

  return { hasApiKey: Boolean(apiKey), from, isTestSender, notify, problems };
}

function parseRecipients(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => isEmail(s));
}

function isEmail(s: string): boolean {
  return /^\S+@\S+\.\S+$/.test(s);
}

export async function sendLeadEmail(
  answers: JobSpecAnswers,
  spec: GeneratedJobSpec
): Promise<LeadEmailResult> {
  const config = getLeadEmailConfig();
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";

  if (!apiKey) {
    // Loud, and with the lead details in the log, so a misconfigured deploy
    // still leaves a recoverable trace in Render's logs.
    console.error(
      "[lead-email] RESEND_API_KEY is not set — lead NOT emailed:",
      JSON.stringify({ name: answers.name, email: answers.email, jobTitle: answers.jobTitle })
    );
    const skipped: DeliveryResult = {
      status: "skipped",
      error: "RESEND_API_KEY is not set",
    };
    return { notification: skipped, copy: { ...skipped } };
  }

  if (config.isTestSender) {
    console.warn("[lead-email] " + config.problems.join(" "));
  }

  const role = answers.jobTitle || "your role";

  // Both sends are independent — a bounced copy to the enquirer must never
  // stop the internal notification (or vice versa), so run them together and
  // report each outcome separately.
  const [notification, copy] = await Promise.all([
    config.notify.length
      ? sendEmail(apiKey, {
          from: config.from,
          to: config.notify,
          reply_to: answers.email,
          subject: `New Job Spec lead: ${answers.name} — ${role}`,
          html: renderLeadHtml(answers, spec),
        })
      : Promise.resolve<DeliveryResult>({
          status: "failed",
          error: "No valid LEAD_NOTIFICATION_EMAIL recipient configured",
        }),
    isEmail(answers.email)
      ? sendEmail(apiKey, {
          from: config.from,
          to: [answers.email],
          reply_to: config.notify[0] ?? answers.email,
          subject: `Your job specification — ${role}`,
          html: renderApplicantHtml(answers, spec),
        })
      : Promise.resolve<DeliveryResult>({
          status: "skipped",
          error: "Submitted email address was not valid",
        }),
  ]);

  return { notification, copy };
}

/** Sends a short test email. Used by the admin "send test email" button so
 *  the whole path can be proven without filling in the public form. */
export async function sendTestLeadEmail(to: string): Promise<DeliveryResult> {
  const config = getLeadEmailConfig();
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  if (!apiKey) {
    return { status: "skipped", error: "RESEND_API_KEY is not set" };
  }
  return sendEmail(apiKey, {
    from: config.from,
    to: [to],
    reply_to: to,
    subject: "Job Spec Creator — lead email test",
    html: wrapper(
      `<h2 style="color:#1a3668;">Lead emails are working</h2>
       <p>This test was sent from <strong>${escapeHtml(config.from)}</strong>.</p>
       <p>If you received this, new Job Spec Creator leads will reach
          <strong>${escapeHtml(config.notify.join(", ") || "(no recipient configured)")}</strong>.</p>`
    ),
  });
}

interface EmailPayload {
  from: string;
  to: string[];
  reply_to: string;
  subject: string;
  html: string;
}

// Resend occasionally 429s or 5xxs. Those are worth one or two quick retries;
// a 4xx (bad sender, unverified domain, invalid recipient) never is — it will
// fail identically forever, so we surface the reason immediately.
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [500, 1500];
const REQUEST_TIMEOUT_MS = 10_000;

async function sendEmail(apiKey: string, payload: EmailPayload): Promise<DeliveryResult> {
  let lastError = "Unknown error";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (res.ok) return { status: "sent" };

      // Classify on the status code alone. Reading the body is only for the
      // error message, so it happens inside its own try — a body-read failure
      // must never demote a permanent 4xx into "retryable" and burn attempts
      // on a request that can only ever fail the same way.
      const status = res.status;
      let body = "";
      try {
        body = (await res.text()).slice(0, 500);
      } catch {
        body = "(response body unreadable)";
      }
      lastError = `Resend ${status}: ${body}`;
      console.error(`[lead-email] error sending to ${payload.to.join(", ")}:`, lastError);

      // Permanent rejection — retrying changes nothing.
      if (status < 500 && status !== 429) {
        return { status: "failed", error: lastError };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error("[lead-email] request failed:", lastError);
    }

    const delay = RETRY_DELAYS_MS[attempt];
    if (delay !== undefined) await sleep(delay);
  }

  return { status: "failed", error: lastError };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Shared spec markup -----------------------------------------------------
function list(items: string[]): string {
  if (!items?.length) return "<p><em>None</em></p>";
  return `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
}

function renderSpec(spec: GeneratedJobSpec, fallbackTitle: string): string {
  const { job_spec, person_spec } = spec;
  return `
    <h2 style="color:#df2681;">${escapeHtml(job_spec.job_title || fallbackTitle)}</h2>
    <p>${escapeHtml(spec.opening_statement)}</p>
    <h3 style="color:#1a3668;">Role overview</h3>
    <p>${escapeHtml(job_spec.role_overview)}</p>
    <h3 style="color:#1a3668;">Key responsibilities</h3>
    ${list(job_spec.key_responsibilities)}
    <h3 style="color:#1a3668;">Experience &amp; skills</h3>
    ${list(job_spec.experience_and_skills)}
    <h3 style="color:#1a3668;">Desirable</h3>
    ${list(job_spec.desirable)}

    <h2 style="color:#df2681;">Person specification</h2>
    <p>${escapeHtml(person_spec.behavioural_summary)}</p>
    <p><strong>DiSC profile:</strong> ${escapeHtml(person_spec.disc_profile)}</p>
    <h3 style="color:#1a3668;">Key behaviours</h3>
    ${list(person_spec.key_behaviours)}
    <h3 style="color:#1a3668;">Motivational drivers</h3>
    ${list(person_spec.motivational_drivers)}
    <h3 style="color:#1a3668;">Watch-outs</h3>
    ${list(person_spec.watch_outs)}`;
}

function wrapper(inner: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#2D2D2D;max-width:680px;margin:0 auto;">${inner}</div>`;
}

// Internal notification — lead details + spec
function renderLeadHtml(answers: JobSpecAnswers, spec: GeneratedJobSpec): string {
  const notes = answers.additionalNotes?.trim()
    ? `<h3 style="color:#1a3668;">Additional notes from submitter</h3><p>${escapeHtml(answers.additionalNotes)}</p>`
    : "";
  return wrapper(`
    <h2 style="color:#1a3668;">New Job Spec lead</h2>
    <table style="border-collapse:collapse;font-size:14px;margin-bottom:20px;">
      <tr><td style="padding:2px 12px 2px 0;color:#666;">Name</td><td>${escapeHtml(answers.name)}</td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#666;">Email</td><td>${escapeHtml(answers.email)}</td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#666;">Company URL</td><td>${escapeHtml(answers.companyUrl)}</td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#666;">Job Title</td><td>${escapeHtml(answers.jobTitle)}</td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#666;">Industry</td><td>${escapeHtml(labelFor(INDUSTRIES, answers.industry))}</td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#666;">Function</td><td>${escapeHtml(labelFor(JOB_FUNCTIONS, answers.jobFunction))}</td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#666;">Seniority</td><td>${escapeHtml(labelFor(SENIORITIES, answers.seniority))}</td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#666;">Accounts</td><td>${escapeHtml(labelFor(ACCOUNT_VOLUMES, answers.accountVolume))}</td></tr>
    </table>
    ${renderSpec(spec, answers.jobTitle)}
    ${notes}
  `);
}

// Applicant copy — friendly intro + spec + consultant CTA
function renderApplicantHtml(answers: JobSpecAnswers, spec: GeneratedJobSpec): string {
  const firstName = (answers.name || "there").split(" ")[0];
  return wrapper(`
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Thanks for using the Aaron Wallis Job Spec Creator. Here's the job
       specification and person specification you created${
         answers.jobTitle ? ` for your <strong>${escapeHtml(answers.jobTitle)}</strong> role` : ""
       }.</p>
    ${renderSpec(spec, answers.jobTitle)}
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
    <p style="font-size:14px;color:#1a3668;"><strong>Hiring salespeople? We can help you fill this role.</strong><br/>
       Call an Aaron Wallis sales recruitment consultant on ${PHONE}.</p>
    <p style="font-size:12px;color:#9ca3af;">This spec was generated as a starting point — please review it for accuracy before publishing.</p>
  `);
}

function escapeHtml(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
