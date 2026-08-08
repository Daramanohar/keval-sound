-- PostgreSQL requires newly-added enum values to be committed before they are
-- used by later DDL statements. Keep this migration intentionally enum-only.

ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'RAZORPAY';
ALTER TYPE "WebhookProvider" ADD VALUE IF NOT EXISTS 'RAZORPAY';
