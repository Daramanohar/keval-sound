CREATE TABLE "billing_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "legal_name" VARCHAR(160) NOT NULL,
    "address_line_1" VARCHAR(240) NOT NULL,
    "address_line_2" VARCHAR(240),
    "city" VARCHAR(120) NOT NULL,
    "state_name" VARCHAR(120) NOT NULL,
    "state_code" VARCHAR(2),
    "postal_code" VARCHAR(20) NOT NULL,
    "country_code" VARCHAR(2) NOT NULL DEFAULT 'IN',
    "gstin" VARCHAR(15),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_profiles_user_id_key" ON "billing_profiles"("user_id");

ALTER TABLE "billing_profiles"
ADD CONSTRAINT "billing_profiles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders"
ADD COLUMN "billing_address_snapshot" JSONB,
ADD COLUMN "customer_gstin_snapshot" VARCHAR(15),
ADD COLUMN "place_of_supply_code" VARCHAR(2),
ADD COLUMN "tax_rate_bps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tax_mode" VARCHAR(16) NOT NULL DEFAULT 'none',
ADD COLUMN "sac_code" VARCHAR(8),
ADD COLUMN "tax_config_version" VARCHAR(40);

ALTER TABLE "subscriptions"
ADD COLUMN "billing_address_snapshot" JSONB,
ADD COLUMN "customer_gstin_snapshot" VARCHAR(15),
ADD COLUMN "place_of_supply_code" VARCHAR(2),
ADD COLUMN "tax_rate_bps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tax_mode" VARCHAR(16) NOT NULL DEFAULT 'none',
ADD COLUMN "sac_code" VARCHAR(8),
ADD COLUMN "tax_config_version" VARCHAR(40);

ALTER TABLE "order_documents"
ADD COLUMN "invoice_number" VARCHAR(16);

CREATE UNIQUE INDEX "order_documents_invoice_number_key"
ON "order_documents"("invoice_number");

CREATE TABLE "invoice_sequences" (
    "key" VARCHAR(32) NOT NULL,
    "next_value" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'RAZORPAY',
    "provider_livemode" BOOLEAN NOT NULL DEFAULT false,
    "provider_payment_id" TEXT NOT NULL,
    "provider_invoice_id" TEXT,
    "invoice_number" VARCHAR(16) NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "taxable_amount_paise" INTEGER NOT NULL,
    "tax_paise" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'SUCCEEDED',
    "paid_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_payments_invoice_number_key"
ON "subscription_payments"("invoice_number");

CREATE UNIQUE INDEX "subscription_payments_provider_provider_livemode_provider_payment_id_key"
ON "subscription_payments"("provider", "provider_livemode", "provider_payment_id");

CREATE INDEX "subscription_payments_subscription_id_paid_at_idx"
ON "subscription_payments"("subscription_id", "paid_at");

ALTER TABLE "subscription_payments"
ADD CONSTRAINT "subscription_payments_subscription_id_fkey"
FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
