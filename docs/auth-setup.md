# Auth setup — Aaron Wallis Recruitment Apps

The whole app is gated by NextAuth. This doc covers what still needs
configuring **once** to make the login flow actually work, and how to
recover if something goes wrong.

## What's already done

- ✅ NextAuth v4 with database sessions (7-day cookie, silent refresh once a day)
- ✅ Google + Microsoft (Azure AD) providers
- ✅ Prisma schema on Postgres, whitelist by user + domain, broad audit log
- ✅ Middleware gates every route by default; public allowlist for `/`, `/login`, `/tools/*`, `/job-spec`, `/api/auth/*`
- ✅ Admin dashboard at `/admin` with Users / Domains / Activity tabs
- ✅ Bootstrap-admin env var (`BOOTSTRAP_ADMIN_EMAIL`) so a fresh deploy is never locked out

## What you need to configure once

### 1. Postgres

On Render, add a Postgres add-on (free tier is fine) and Render will set
`DATABASE_URL` automatically. Locally, set it in `.env.local`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/awapps?schema=public
```

Then apply the schema:

```
# Local dev with a fresh DB
npx prisma db push
# ...or if you want migration history
npx prisma migrate deploy
# Optional (BOOTSTRAP_ADMIN_EMAIL covers the same case)
npx prisma db seed
```

On production/Render, the build script runs `prisma generate` automatically.
To apply migrations on every deploy, update the Render build command to:

```
npm install && npx prisma migrate deploy && npm run build
```

If you already deployed and got "The table `public.Account` does not exist"
errors from NextAuth, run this once in the Render shell to catch up:

```
npx prisma migrate deploy
```

### 2. NextAuth secret + URL

```
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=https://your-domain.example.com
```

### 3. Google OAuth (5 minutes)

1. https://console.cloud.google.com → "APIs & Services" → "Credentials"
2. "Create Credentials" → "OAuth client ID" → Web application
3. Add authorised redirect URIs:
   - `https://your-domain.example.com/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (for dev)
4. Copy the client ID + secret into `.env.local` / Render env:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### 4. Microsoft OAuth (5 minutes)

1. https://portal.azure.com → "App registrations" → "New registration"
2. Supported account types: **Personal Microsoft accounts + any org directory** (multi-tenant)
3. Redirect URI (Web):
   - `https://your-domain.example.com/api/auth/callback/azure-ad`
   - `http://localhost:3000/api/auth/callback/azure-ad`
4. In "Certificates & secrets", create a new client secret
5. Copy values into `.env.local` / Render env:

```
AZURE_AD_CLIENT_ID=...
AZURE_AD_CLIENT_SECRET=...
AZURE_AD_TENANT_ID=common  # leave as "common" for multi-tenant
```

### 5. Bootstrap admin

```
BOOTSTRAP_ADMIN_EMAIL=andyboyle95@gmail.com
```

If the DB is empty (fresh deploy, seed didn't run) OR you accidentally
delete every admin, whoever signs in with this email is auto-promoted
to ADMIN on their next login. This is the recovery lever.

## Access model

Two roles: **ADMIN** and **USER**. (No MANAGER — add it later if a distinct
permission set actually exists for it.)

Access precedence, highest to lowest:

1. Individual `AllowedUser` row — a specific email, wins over everything
2. `AllowedDomain` match — anyone at `@example.com` gets the domain's role
3. `BOOTSTRAP_ADMIN_EMAIL` env var — safety net

A revoked individual row **always denies**, even if the domain would allow.

The whitelist is re-checked in NextAuth's `session` callback on **every
request**. So if you revoke someone in the admin dashboard, their next
page load bounces them to `/login`. If you change their role, their next
page load reflects the new role. No re-login needed.

## Public routes (no auth required)

Edit `src/middleware.ts` to change this. Current allowlist:

- `/` — landing page (nicer UX than a hard login wall)
- `/login`
- `/tools/*` — static tools like the WC26 planner (shareable)
- `/job-spec` — public lead-gen form
- `/api/auth/*` — NextAuth endpoints
- Static Next.js assets, favicon, logo

Everything else — including all AI-cost API routes — is gated.

## First run checklist

1. Set `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `BOOTSTRAP_ADMIN_EMAIL`
2. Run `npx prisma migrate deploy`
3. Run `npx prisma db seed` (optional — bootstrap env var covers the same case)
4. Set Google + Microsoft OAuth credentials
5. Sign in as bootstrap admin
6. Add users / domains as needed via `/admin`
