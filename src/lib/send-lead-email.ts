import type { GeneratedJobSpec } from "./job-spec-schema";
import {
  ACCOUNT_VOLUMES,
  INDUSTRIES,
  JOB_FUNCTIONS,
  SENIORITIES,
  labelFor,
  type JobSpecAnswers,
} from "./job-spec-config";

// Emails the generated spec via the Resend REST API. No database is used —
// leads are only ever emailed (GDPR: nothing is stored server-side).
//
// Configured via env vars (set these in Render):
//   RESEND_API_KEY          — Resend API key
//   LEAD_FROM_EMAIL         — verified sender, e.g. "Aaron Wallis Job Spec <noreply@send.aaronwallis.co.uk>"
//   LEAD_NOTIFICATION_EMAIL — where leads land (e.g. info@aaronwallis.co.uk)
//
// Two emails are sent per submission:
//   1. Lead notification → LEAD_NOTIFICATION_EMAIL (full details + spec)
//   2. A copy of the spec → the person who filled in the form (answers.email)
// NOTE: sending to info@ and to applicants both require a VERIFIED domain in
// Resend. The test sender (onboarding@resend.dev) only delivers to your own
// Resend account address.

const PHONE = "01908 061 400";

export async function sendLeadEmail(
  answers: JobSpecAnswers,
  spec: GeneratedJobSpec
): Promise<boolean> {
  const apiKey =
    process.env.RESEND_API_KEY || "re_E7NwRa2F_AiY9ZHpLCFB7VN7AbpraFG87";
  const from =
    process.env.LEAD_FROM_EMAIL || "Job Spec Creator <onboarding@resend.dev>";
  const notify =
    process.env.LEAD_NOTIFICATION_EMAIL || "info@aaronwallis.co.uk";

  if (!apiKey || !from) {
    console.warn("[lead-email] RESEND_API_KEY/LEAD_FROM_EMAIL not set — skipping.");
    return false;
  }

  const role = answers.jobTitle || "your role";

  // 1) Internal lead notification
  const leadOk = await sendEmail(apiKey, {
    from,
    to: notify,
    reply_to: answers.email,
    subject: `New Job Spec lead: ${answers.name} — ${role}`,
    html: renderLeadHtml(answers, spec),
  });

  // 2) Copy to the person who completed the form
  let applicantOk = true;
  if (answers.email && /\S+@\S+\.\S+/.test(answers.email)) {
    applicantOk = await sendEmail(apiKey, {
      from,
      to: answers.email,
      reply_to: notify,
      subject: `Your job specification — ${role}`,
      html: renderApplicantHtml(answers, spec),
    });
  }

  return leadOk && applicantOk;
}

interface EmailPayload {
  from: string;
  to: string;
  reply_to: string;
  subject: string;
  html: string;
}

async function sendEmail(apiKey: string, payload: EmailPayload): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(
        `[lead-email] Resend error sending to ${payload.to}:`,
        res.status,
        await res.text()
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("[lead-email] Failed to send:", err);
    return false;
  }
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
