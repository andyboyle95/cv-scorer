# Deployment / Handover Guide

This is a **Next.js 15 (App Router) application** — a Node server, not a static
site. It serves a React front-end **and** server-side API routes
(`/api/*`) that call the Anthropic (Claude) API, fetch company websites, and
send lead emails via Resend. It therefore **must run as a Node process** and
cannot be hosted as static files inside Umbraco/IIS directly.

It is a multi-tool app. Routes:
- `/` – tool hub (home)
- `/score` – CV Scorer
- `/generate` – CV Generator (PDF)
- `/interview` – Interview Question Generator
- `/commute` – Cost of Commuting Calculator
- `/job-spec` – Job Spec Creator

## 1. Prerequisites
- **Node.js 20 LTS** (Next 15 needs ≥18.18; use 20).
- npm (ships with Node).

## 2. Environment variables
Create `.env.local` (local) or set these in the host's environment:

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Yes** | All AI features (job spec, CV scorer/generator, interview questions). Without it those routes return 503. |
| `RESEND_API_KEY` | For lead emails | Job Spec Creator lead notifications. *(Currently has a baked-in fallback in `src/lib/send-lead-email.ts` — move it here and delete the literal, then rotate the key.)* |
| `LEAD_FROM_EMAIL` | For lead emails | Verified Resend sender, e.g. `Job Spec <noreply@aaronwallis.co.uk>`. |
| `LEAD_NOTIFICATION_EMAIL` | Optional | Where lead emails are sent (defaults to a hard-coded address). |
| `SITE_PASSWORD`, `AUTH_SECRET` | No | Legacy password gate. The middleware currently does **not** enforce auth. |

See `.env.example`.

## 3. Run locally
```bash
npm install
npm run dev        # http://localhost:3000
```

## 4. Production build & start
```bash
npm install
npm run build
npm start          # serves on port 3000 (override with: npx next start -p 8080)
```
`npm start` launches a long-running Node server — it must stay running
(behind a process manager), not be invoked per-request.

## 5. Hosting options on the Aaron Wallis (Windows/IIS) infrastructure
The app needs a Node runtime. Pick one:

**A. Keep it on the existing Node host (simplest).**
It is already deployed on Render. Surface it on the brand domain via either:
- a **subdomain** (`jobspec.aaronwallis.co.uk`) — add the custom domain in the
  host + a CNAME in DNS; **no code changes**; or
- a **subpath** (`aaronwallis.co.uk/job-spec`) — see section 6.

**B. Run Node on the Windows/IIS server.**
1. Install Node 20 on the server.
2. `npm install && npm run build`.
3. Run `npm start` under a process manager (a **Windows Service**, **PM2**, or
   **iisnode**) so it restarts on reboot/crash.
4. Add an **IIS reverse proxy** (URL Rewrite + Application Request Routing)
   from the public path to the Node port (e.g. `localhost:3000`).
5. SSL is terminated by IIS using the existing certificate.

**C. Azure App Service (Node) / Vercel / any Node PaaS.**
Point it at the repo, set the env vars, build command `npm run build`,
start command `npm start`.

## 6. Serving at a subpath (`aaronwallis.co.uk/job-spec`)
Next.js emits assets/API from the root, so for a subpath you must set a base
path **and** proxy it:
1. In `next.config.ts` add `basePath: '/job-spec'` (and update the client
   `fetch('/api/...')` calls to include the base path).
2. IIS ARR rule: `^job-spec(/.*)?$` → the Node app.
3. Add `job-spec` to Umbraco's `umbracoReservedPaths` so Umbraco doesn't try to
   resolve the path itself.

(`basePath` is app-wide; if only the Job Spec Creator should be public, that's
fine — the other tools simply also sit under `/job-spec`. To keep their URLs
clean, deploy the Job Spec Creator as its own instance.)

## 7. Notes
- **Not a static export.** `next export` will not work — the `/api/*` routes
  need a server.
- **Secrets:** rotate the Resend key once it's moved into env vars.
- **External services used at runtime:** Anthropic API, Resend, `postcodes.io`
  + OSRM (commute tool), OpenStreetMap tiles. Outbound HTTPS must be allowed.
- **Node packages requiring server runtime:** `pdf-parse`, `mammoth`
  (declared in `serverExternalPackages` in `next.config.ts`).
