-- Add the public, immutable Keval identity used on licenses and invoices.
-- Existing users are backfilled before the column becomes required.
ALTER TABLE "users" ADD COLUMN "keval_user_id" TEXT;

UPDATE "users"
SET "keval_user_id" = 'KVL-' || UPPER(
  SUBSTRING(
    MD5("id" || "clerk_user_id" || RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT),
    1,
    12
  )
)
WHERE "keval_user_id" IS NULL;

ALTER TABLE "users" ALTER COLUMN "keval_user_id" SET NOT NULL;

CREATE UNIQUE INDEX "users_keval_user_id_key" ON "users"("keval_user_id");
