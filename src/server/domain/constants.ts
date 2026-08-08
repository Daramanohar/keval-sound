import "server-only";

export const COMMERCE_CURRENCY = "INR" as const;
export const TRACK_PRICE_PAISE = 9_900;
export const FREE_DAILY_STREAM_LIMIT = 10;
export const CHECKOUT_RESERVATION_MINUTES = 30;
export const CHECKOUT_RESERVATION_GRACE_MINUTES = 10;
export const MEDIA_TOKEN_TTL_SECONDS = 20 * 60;
export const DOWNLOAD_GRANT_TTL_SECONDS = 15 * 60;
export const LICENSE_TERMS_VERSION = "2026-08-01";

export const MONEY_LIMITS = {
  minimumPaise: 100,
  maximumOrderPaise: 99_900,
} as const;
