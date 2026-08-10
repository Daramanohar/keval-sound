-- Keval Sound is moving to Razorpay before commerce launch. Abort if payment
-- data appears between the pre-deployment audit and this migration, rather
-- than destructively replacing provider-specific identifiers.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "orders")
     OR EXISTS (SELECT 1 FROM "payments")
     OR EXISTS (SELECT 1 FROM "refunds")
     OR EXISTS (SELECT 1 FROM "subscriptions")
     OR EXISTS (SELECT 1 FROM "order_documents")
     OR EXISTS (
       SELECT 1 FROM "users"
       WHERE "stripe_test_customer_id" IS NOT NULL
          OR "stripe_live_customer_id" IS NOT NULL
     )
     OR EXISTS (
       SELECT 1 FROM "plans"
       WHERE "stripe_test_product_id" IS NOT NULL
          OR "stripe_test_price_id" IS NOT NULL
          OR "stripe_live_product_id" IS NOT NULL
          OR "stripe_live_price_id" IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'Razorpay migration requires empty commerce tables and unset Stripe identifiers';
  END IF;
END $$;

DROP INDEX IF EXISTS "users_stripe_test_customer_id_key";
DROP INDEX IF EXISTS "users_stripe_live_customer_id_key";
ALTER TABLE "users"
  DROP COLUMN IF EXISTS "stripe_test_customer_id",
  DROP COLUMN IF EXISTS "stripe_live_customer_id";

DROP INDEX IF EXISTS "orders_stripe_livemode_stripe_checkout_session_id_key";
DROP INDEX IF EXISTS "orders_stripe_livemode_stripe_payment_intent_id_key";
DROP INDEX IF EXISTS "orders_stripe_livemode_stripe_invoice_id_key";
ALTER TABLE "orders"
  DROP COLUMN IF EXISTS "stripe_livemode",
  DROP COLUMN IF EXISTS "stripe_checkout_session_id",
  DROP COLUMN IF EXISTS "stripe_payment_intent_id",
  DROP COLUMN IF EXISTS "stripe_invoice_id",
  ADD COLUMN "payment_provider" "PaymentProvider" NOT NULL DEFAULT 'RAZORPAY',
  ADD COLUMN "provider_livemode" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "provider_order_id" TEXT,
  ADD COLUMN "provider_invoice_id" TEXT;

CREATE UNIQUE INDEX "orders_payment_provider_provider_livemode_provider_order_id_key"
  ON "orders"("payment_provider", "provider_livemode", "provider_order_id");
CREATE UNIQUE INDEX "orders_payment_provider_provider_livemode_provider_invoice_id_key"
  ON "orders"("payment_provider", "provider_livemode", "provider_invoice_id");

DROP INDEX IF EXISTS "payments_provider_provider_livemode_provider_payment_intent_key";
DROP INDEX IF EXISTS "payments_provider_provider_livemode_provider_payment_intent_id_key";
DROP INDEX IF EXISTS "payments_provider_provider_livemode_provider_charge_id_key";
ALTER TABLE "payments"
  RENAME COLUMN "provider_payment_intent_id" TO "provider_payment_id";
ALTER TABLE "payments"
  DROP COLUMN IF EXISTS "provider_charge_id";
ALTER TABLE "payments"
  ALTER COLUMN "provider" SET DEFAULT 'RAZORPAY';
CREATE UNIQUE INDEX "payments_provider_provider_livemode_provider_payment_id_key"
  ON "payments"("provider", "provider_livemode", "provider_payment_id");

DROP INDEX IF EXISTS "refunds_provider_livemode_provider_refund_id_key";
ALTER TABLE "refunds"
  ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'RAZORPAY',
  ADD COLUMN "idempotency_key" TEXT NOT NULL;
CREATE UNIQUE INDEX "refunds_provider_provider_livemode_provider_refund_id_key"
  ON "refunds"("provider", "provider_livemode", "provider_refund_id");
CREATE UNIQUE INDEX "refunds_idempotency_key_key" ON "refunds"("idempotency_key");

DROP INDEX IF EXISTS "plans_stripe_test_product_id_key";
DROP INDEX IF EXISTS "plans_stripe_test_price_id_key";
DROP INDEX IF EXISTS "plans_stripe_live_product_id_key";
DROP INDEX IF EXISTS "plans_stripe_live_price_id_key";
ALTER TABLE "plans"
  DROP COLUMN IF EXISTS "stripe_test_product_id",
  DROP COLUMN IF EXISTS "stripe_test_price_id",
  DROP COLUMN IF EXISTS "stripe_live_product_id",
  DROP COLUMN IF EXISTS "stripe_live_price_id",
  ADD COLUMN "razorpay_test_plan_id" TEXT,
  ADD COLUMN "razorpay_live_plan_id" TEXT;
CREATE UNIQUE INDEX "plans_razorpay_test_plan_id_key" ON "plans"("razorpay_test_plan_id");
CREATE UNIQUE INDEX "plans_razorpay_live_plan_id_key" ON "plans"("razorpay_live_plan_id");

ALTER TABLE "subscriptions"
  RENAME COLUMN "provider_price_id" TO "provider_plan_id";
ALTER TABLE "subscriptions"
  ALTER COLUMN "provider" SET DEFAULT 'RAZORPAY';

DROP INDEX IF EXISTS "order_documents_provider_livemode_provider_document_id_key";
ALTER TABLE "order_documents"
  ADD COLUMN "provider" "PaymentProvider";
CREATE UNIQUE INDEX "order_documents_provider_provider_livemode_provider_document_id_key"
  ON "order_documents"("provider", "provider_livemode", "provider_document_id");
