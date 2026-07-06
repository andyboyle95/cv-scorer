// Sentry — server-side (Node.js runtime) error capture.
//
// Reads SENTRY_DSN (NOT NEXT_PUBLIC_ — server-only). Same no-DSN =
// no-op pattern as the client config.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // Same PII scrub as the client — don't ship candidate data to Sentry.
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
