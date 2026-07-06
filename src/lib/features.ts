// Feature flags — single source of truth for switching whole features on
// and off without ripping code out. Keep the flag names stable so the
// downstream guards don't drift.
//
// Any feature that stores candidate PII (CV content) either client- or
// server-side should live behind a flag until the relevant policies
// (privacy notice, retention, DPIA where required) are in place.

export const FEATURES = {
  /**
   * CV auto-save + Recent CVs.
   *
   * When ON:
   *  - Client debounces changes to localStorage (namespaced per user)
   *  - Client syncs to Postgres every 60s and on every Download PDF/DOCX
   *  - Toolbar shows "Recent ▾" dropdown, "Saved X ago" chip
   *  - Empty state offers to restore a stray local draft
   *
   * When OFF (current default — GDPR review pending):
   *  - No writes to localStorage
   *  - No writes to Postgres (both API routes short-circuit with 503)
   *  - Toolbar / empty-state UI hides all draft-related elements
   *  - Every other CV Generator feature still works exactly as before
   *
   * To turn back on: set `cvDrafts: true`, redeploy, and consider running
   * a one-off cleanup of any existing rows in the CvDraft table if the
   * old data isn't compliant with the new retention policy.
   */
  cvDrafts: false,
} as const;
