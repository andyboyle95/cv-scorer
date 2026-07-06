# Sentry setup — turning it on

Sentry SDK is already installed and wired. It's dormant until you provide
DSNs via env vars. Zero code changes needed to activate.

## 1. Create a Sentry project (~2 min)

1. Sign up at https://sentry.io (free tier is generous — 5k errors/mo)
2. New Project → **Next.js** → name it `aaron-wallis-apps`
3. Copy the two DSNs from the setup wizard:
   - A **public** DSN (safe to expose in the browser)
   - A **server** DSN (server-side only — treat like an API key)

Sentry usually gives you the same DSN for both. If they only give one, use it for both env vars.

## 2. Add env vars to Render (~30 sec)

Render → your web service → Environment → Add:

```
NEXT_PUBLIC_SENTRY_DSN=<the public DSN>
SENTRY_DSN=<the server DSN>
```

Save. Render redeploys. Sentry starts capturing errors immediately.

## 3. What we're capturing

- **Client:** uncaught JS errors, unhandled promise rejections, 10% of transactions traced
- **Server:** API route exceptions, unhandled crashes, 10% of transactions traced
- **Edge (middleware):** any middleware exception

## What we're NOT sending to Sentry

To respect candidate privacy, we scrub these fields from any error payload
before shipping (see `sentry.client.config.ts` / `sentry.server.config.ts`):

- `candidateName`
- `linkedIn`
- `executiveSummary`
- `profile`

If Sentry ever shows you an error and one of those fields is present in
the payload, that's a bug in the scrubber — fix it there rather than
adding an exception rule in Sentry.

## Turning it back off

Delete the two env vars on Render, redeploy. `Sentry.init(...)` inside
each config file gates on the DSN being truthy, so with the vars removed
the SDK does nothing at runtime. No code changes needed to disable.
