# Keval Sound Backend Database + Clerk Sync

This document describes the first backend database milestone.

## Current Goal

Mirror Clerk users into Postgres so Keval Sound has its own business database.

Clerk remains responsible for authentication:

- email/password login
- Google login
- email verification
- sessions
- secure password storage

Postgres becomes responsible for Keval Sound business data:

- internal users
- purchases
- subscriptions
- licenses
- download events
- stream events
- future metadata search index

## Required Environment Variables

Add these locally in `.env.local` and in Vercel Project Settings.

```env
DATABASE_URL=postgresql://...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
```

Do not commit either value.

## Database Setup

Recommended provider for the next step:

- Neon Postgres through Vercel Marketplace, or
- Vercel Postgres, or
- any managed Postgres database

After `DATABASE_URL` is available:

```powershell
npm run db:generate
npm run db:push
```

Use `db:push` for the first live schema setup. Use `db:migrate` once the schema stabilizes and migrations are part of the workflow.

## Clerk Webhook Setup

Create a Clerk webhook endpoint:

```text
https://app.kevalsound.com/api/webhooks/clerk
```

Subscribe to:

- `user.created`
- `user.updated`
- `user.deleted`

Copy the Clerk webhook signing secret into:

```env
CLERK_WEBHOOK_SIGNING_SECRET=...
```

The webhook route verifies signatures with Clerk before writing to the database.

## Sync Rules

The DB `users` table uses:

```text
clerk_user_id
```

as the unique external identity.

Webhook writes are idempotent:

- `user.created` uses upsert
- `user.updated` uses upsert
- `user.deleted` soft-deletes the local user row

This prevents duplicate users when Clerk retries a webhook event.

## Onboarding Mirroring

Onboarding is saved to Clerk `publicMetadata` first, then mirrored into Postgres when `DATABASE_URL` is configured.

Stored fields:

```json
{
  "onboarding": {
    "useCase": "films-videos",
    "sounds": ["hip-hop-rap", "occasion"],
    "completedAt": "2026-06-08T..."
  }
}
```

## Important Launch Note

Do not enable Clerk webhooks before production has a valid `DATABASE_URL`.

If the webhook is enabled without a database, the endpoint returns `503 database_not_configured` so Clerk retries instead of silently dropping the event.

## Future Backfill Requirement

If users sign up before the database/webhook is active, run a one-time Clerk user backfill before payments launch. That script should:

1. List all Clerk users from Clerk Backend API.
2. Upsert every user into Postgres by `clerk_user_id`.
3. Compare Clerk user count and DB user count.
4. Report any missing users.

Do not start paid purchases until Clerk and DB user counts reconcile.
