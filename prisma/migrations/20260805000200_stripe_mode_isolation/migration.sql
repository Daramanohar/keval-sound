BEGIN;

-- This migration is safe only before Stripe objects exist. Abort rather than
-- silently mixing sandbox and live identifiers if payment work has started.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "users" WHERE "stripe_customer_id" IS NOT NULL)
     OR EXISTS (SELECT 1 FROM "plans" WHERE "stripe_product_id" IS NOT NULL OR "stripe_price_id" IS NOT NULL)
     OR EXISTS (SELECT 1 FROM "orders")
     OR EXISTS (SELECT 1 FROM "payments")
     OR EXISTS (SELECT 1 FROM "refunds")
     OR EXISTS (SELECT 1 FROM "subscriptions")
     OR EXISTS (SELECT 1 FROM "order_documents") THEN
    RAISE EXCEPTION 'Stripe mode isolation requires empty commerce tables and unset Stripe identifiers';
  END IF;
END $$;

-- DropIndex
DROP INDEX "order_documents_provider_document_id_key";

-- DropIndex
DROP INDEX "orders_stripe_checkout_session_id_key";

-- DropIndex
DROP INDEX "orders_stripe_invoice_id_key";

-- DropIndex
DROP INDEX "orders_stripe_payment_intent_id_key";

-- DropIndex
DROP INDEX "payments_provider_charge_id_key";

-- DropIndex
DROP INDEX "payments_provider_payment_intent_id_key";

-- DropIndex
DROP INDEX "plans_stripe_price_id_key";

-- DropIndex
DROP INDEX "plans_stripe_product_id_key";

-- DropIndex
DROP INDEX "refunds_provider_refund_id_key";

-- DropIndex
DROP INDEX "subscriptions_provider_subscription_id_key";

-- DropIndex
DROP INDEX "users_stripe_customer_id_key";

-- AlterTable
ALTER TABLE "order_documents" ADD COLUMN     "provider_livemode" BOOLEAN;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "stripe_livemode" BOOLEAN;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "provider_livemode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "plans" DROP COLUMN "stripe_price_id",
DROP COLUMN "stripe_product_id",
ADD COLUMN     "stripe_live_price_id" TEXT,
ADD COLUMN     "stripe_live_product_id" TEXT,
ADD COLUMN     "stripe_test_price_id" TEXT,
ADD COLUMN     "stripe_test_product_id" TEXT;

-- AlterTable
ALTER TABLE "refunds" ADD COLUMN     "provider_livemode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "provider_livemode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "stripe_customer_id",
ADD COLUMN     "stripe_live_customer_id" TEXT,
ADD COLUMN     "stripe_test_customer_id" TEXT;

-- AlterTable
ALTER TABLE "webhook_events" ADD COLUMN     "provider_livemode" BOOLEAN;

-- CreateIndex
CREATE UNIQUE INDEX "order_documents_provider_livemode_provider_document_id_key" ON "order_documents"("provider_livemode", "provider_document_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_stripe_livemode_stripe_checkout_session_id_key" ON "orders"("stripe_livemode", "stripe_checkout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_stripe_livemode_stripe_payment_intent_id_key" ON "orders"("stripe_livemode", "stripe_payment_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_stripe_livemode_stripe_invoice_id_key" ON "orders"("stripe_livemode", "stripe_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_provider_livemode_provider_payment_intent_key" ON "payments"("provider", "provider_livemode", "provider_payment_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_provider_livemode_provider_charge_id_key" ON "payments"("provider", "provider_livemode", "provider_charge_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_stripe_test_product_id_key" ON "plans"("stripe_test_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_stripe_test_price_id_key" ON "plans"("stripe_test_price_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_stripe_live_product_id_key" ON "plans"("stripe_live_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_stripe_live_price_id_key" ON "plans"("stripe_live_price_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_provider_livemode_provider_refund_id_key" ON "refunds"("provider_livemode", "provider_refund_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_provider_provider_livemode_provider_subscript_key" ON "subscriptions"("provider", "provider_livemode", "provider_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_test_customer_id_key" ON "users"("stripe_test_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_live_customer_id_key" ON "users"("stripe_live_customer_id");

COMMIT;
