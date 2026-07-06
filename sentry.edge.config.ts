// Sentry — Edge runtime (middleware) error capture.
//
// The middleware runs on the Edge, so it needs a distinct config. Same
// no-op pattern as the other two — if SENTRY_DSN is unset we don't
// register anything.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
