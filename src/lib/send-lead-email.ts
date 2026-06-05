import type { GeneratedJobSpec } from "./job-spec-schema";
import {
  ACCOUNT_VOLUMES,
  INDUSTRIES,
  JOB_FUNCTIONS,
  SENIORITIES,
  labelFor,
  type JobSpecAnswers,
} from "./job-spec-config";

// Sends the generated spec + lead details via the Resend REST API.
// Configured purely through env vars so no key needs to live in the repo:
//   RESEND_API_KEY       — your Resend API key (required to actually send)
//   LEAD_FROM_EMAIL      — verified "from" address, e.g. "Job Spec <noreply@yourdomain.com>"
//   LEAD_NOTIFICATION_EMAIL — where lead notifications are sent (defaults to andyboyleaw@gmail.com)
// If RESEND_API_KEY is absent the call is a no-op (logs and returns false) so
// the form still works end-to-end in development.

export async function sendLeadEmail(
  answers: JobSpecAnswers,
  spec: GeneratedJobSpec
): Promise<boolean> {
  // Beta fallbacks: prefer Render env vars, but fall back to baked-in values
  // so lead emails work without dashboard config. Move these into Render's
  // Environment tab and delete the literals here when ready (then rotate key).
  const apiKey =
    process.env.RESEND_API_KEY || "re_E7NwRa2F_AiY9ZHpLCFB7VN7AbpraFG87";
  const from =
    process.env.LEAD_FROM_EMAIL || "Job Spec Creator <onboarding@resend.dev>";
  const to =
    process.env.LEAD_NOTIFICATION_EMAIL || "andyboyleaw@gmail.com";

  if (!apiKey || !from) {
    console.warn(
      "[lead-email] RESEND_API_KEY/LEAD_FROM_EMAIL not set — skipping email. Lead:",
      JSON.stringify({
        name: answers.name,
        email: answers.email,
        companyUrl: answers.companyUrl,
        jobTitle: answers.jobTitle,
      })
    );
    return false;
  }

  const subject = `New Job Spec lead: ${answers.name} — ${answers.jobTitle}`;
  const html = renderEmailHtml(answers, spec);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: answers.email,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      console.error("[lead-email] Resend error:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[lead-email] Failed to send:", err);
    return false;
  }
}

function list(items: string[]): string {
  if (!items?.length) return "<p><em>None</em></p>";
  return `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
}

function renderEmailHtml(
  answers: JobSpecAnswers,
  spec: GeneratedJobSpec
): string {
  const { job_spec, person_spec } = spec;
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#2D2D2D;max-width:680px;margin:0 auto;">
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

    <h2 style="color:#df2681;">${escapeHtml(job_spec.job_title || answers.jobTitle)}</h2>
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
    ${list(person_spec.watch_outs)}

    ${
      answers.additionalNotes?.trim()
        ? `<h3 style="color:#1a3668;">Additional notes from submitter</h3><p>${escapeHtml(
            answers.additionalNotes
          )}</p>`
        : ""
    }
  </div>`;
}

function escapeHtml(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
