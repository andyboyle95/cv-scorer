// Sentry — client-side error capture.
//
// Reads NEXT_PUBLIC_SENTRY_DSN from env at build time. If unset, we do
// nothing (Sentry.init just no-ops with an empty DSN). So on any deploy
// without a DSN, this file is a zero-effect passthrough — no reporting,
// no console noise, no runtime failure.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    // 10% of transactions traced. Bump if the app gets quiet, drop to 0
    // if invoice creeps up.
    tracesSampleRate: 0.1,
    // Ignore uninteresting resize/observer warnings that clutter the
    // dashboard on production browsers.
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
    ],
    beforeSend(event) {
      // Never ship email addresses or names to Sentry — most of our data
      // is candidate PII and we've committed not to log it.
      if (event.request?.data && typeof event.request.data === "object") {
        delete (event.request.data as Record<string, unknown>).candidateName;
        delete (event.request.data as Record<string, unknown>).linkedIn;
        delete (event.request.data as Record<string, unknown>).executiveSummary;
        delete (event.request.data as Record<string, unknown>).profile;
      }
      return event;
    },
  });
}
