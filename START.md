# Saloo — How to Start the Project

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9.15.9 → `npm install -g pnpm`
- **Supabase CLI** → `npm install -g supabase`

---

## 1. First-Time Setup

```bash
# Clone and install all dependencies from repo root
cd Saloo
pnpm install
```

Copy the env file and fill in your credentials:

```bash
cp .env.example .env
```

Required keys to fill in `.env`:

| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay Dashboard → API Keys |
| `RAZORPAY_KEY_SECRET` | Razorpay Dashboard → API Keys |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Dashboard → Webhooks |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Cloud Console → Maps JS API |
| `FIREBASE_PROJECT_ID` | Firebase Console → Project Settings |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Console → Service Accounts → Generate key (stringify JSON) |

---

## 2. Start Web (Next.js)

```bash
cd apps
pnpm dev
```

Runs at → **http://localhost:3000**

> To run from root using Turborepo:
> ```bash
> pnpm dev --filter=@saloo/web
> ```

---

---

---

## 4. Start Backend (Supabase Edge Functions)

### Link to your Supabase project (first time only)

```bash
# Login to Supabase CLI
npx supabase login --token YOUR_ACCESS_TOKEN

# Link to your remote project
npx supabase link --project-ref YOUR_PROJECT_REF
```

> Find `YOUR_PROJECT_REF` in Supabase Dashboard → Project Settings → General

### Set Edge Function secrets

```bash
npx supabase secrets set RAZORPAY_KEY_ID=xxx
npx supabase secrets set RAZORPAY_KEY_SECRET=xxx
npx supabase secrets set RAZORPAY_WEBHOOK_SECRET=xxx
npx supabase secrets set FIREBASE_PROJECT_ID=xxx
npx supabase secrets set FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
npx supabase secrets set GOOGLE_MAPS_API_KEY=xxx
```

> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected — do NOT set them manually.

### Deploy all Edge Functions

```bash
npx supabase functions deploy --no-verify-jwt
```

### Serve Edge Functions locally (optional)

```bash
npx supabase functions serve
```

Runs at → **http://localhost:54321/functions/v1/**

---

## 5. Database Setup (First Time Only)

1. Open **Supabase Dashboard → SQL Editor**
2. Paste the contents of `supabase/schema.sql`
3. Click **Run**

This creates all 17 tables, RLS policies, storage buckets, triggers, and indexes.

---

## 6. Quick Reference — All Start Commands

| What | Command | URL |
|------|---------|-----|
| Web | `cd apps && pnpm dev` | http://localhost:3000 |
| Edge Functions (local) | `npx supabase functions serve` | http://localhost:54321/functions/v1/ |
| Deploy Functions (cloud) | `npx supabase functions deploy --no-verify-jwt` | Supabase Cloud |

---

## 7. Supabase Dashboard Checklist

Before testing auth, make sure these are configured:

- **Auth → Providers → Phone** — Twilio enabled, Messaging Service SID set, "Enable phone confirmations" **OFF**
- **Auth → URL Configuration → Site URL** — set to `http://localhost:3000`
- **Auth → URL Configuration → Redirect URLs** — add `http://localhost:3000/**`
- **Auth → Settings → OTP Expiry** — set to `3600` seconds

---

## Troubleshooting

**`pnpm install` fails** — make sure Node >= 20 and pnpm >= 9 are installed.

**Web won't start** — check that `apps/.env.local` or root `.env` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**OTP not arriving** — verify Twilio credentials in Supabase Dashboard → Auth → Providers → Phone.

**Email redirect not working** — make sure `http://localhost:3000/**` is added to Supabase Redirect URLs.

**Edge Function returns 401/403** — expected for auth-protected routes. Pass a valid Bearer token in the `Authorization` header.
