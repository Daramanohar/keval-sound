-- Track chargebacks independently from orders so finance operations retain the
-- provider state, response deadline, and outcome for every disputed payment.

CREATE TYPE "PaymentDisputeStatus" AS ENUM (
  'OPEN',
  'ACTION_REQUIRED',
  'UNDER_REVIEW',
  'WON',
  'LOST',
  'CLOSED'
);

ALTER TABLE "refunds"
  ADD COLUMN "affects_order_access" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "payment_disputes" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "payment_id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'RAZORPAY',
  "provider_livemode" BOOLEAN NOT NULL DEFAULT false,
  "provider_dispute_id" TEXT NOT NULL,
  "status" "PaymentDisputeStatus" NOT NULL,
  "last_event_type" TEXT NOT NULL,
  "affects_order_access" BOOLEAN NOT NULL DEFAULT true,
  "amount_paise" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
  "reason_code" TEXT,
  "phase" TEXT,
  "respond_by" TIMESTAMP(3),
  "provider_created_at" TIMESTAMP(3),
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payment_disputes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_disputes_provider_provider_livemode_provider_dispute_id_key"
  ON "payment_disputes"("provider", "provider_livemode", "provider_dispute_id");
CREATE INDEX "payment_disputes_order_id_status_idx"
  ON "payment_disputes"("order_id", "status");
CREATE INDEX "payment_disputes_payment_id_idx"
  ON "payment_disputes"("payment_id");
CREATE INDEX "payment_disputes_status_respond_by_idx"
  ON "payment_disputes"("status", "respond_by");

ALTER TABLE "payment_disputes"
  ADD CONSTRAINT "payment_disputes_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_disputes"
  ADD CONSTRAINT "payment_disputes_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
