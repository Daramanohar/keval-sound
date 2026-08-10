import "server-only";

import { z } from "zod";

const razorpayApiSchema = z.object({
  RAZORPAY_KEY_ID: z.string().regex(/^rzp_(test|live)_[A-Za-z0-9]+$/),
  RAZORPAY_KEY_SECRET: z.string().min(16),
});

const razorpayWebhookSchema = z.object({
  RAZORPAY_WEBHOOK_SECRET: z.string().min(32),
  RAZORPAY_WEBHOOK_SECRET_PREVIOUS: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim().length === 0 ? undefined : value,
    z.string().min(32).optional()
  ),
});

export type RazorpayApiConfig = z.infer<typeof razorpayApiSchema>;
export type RazorpayWebhookConfig = z.infer<typeof razorpayWebhookSchema>;

function formatEnvironmentError(scope: string, error: z.ZodError) {
  const invalidNames = error.issues.map((issue) => issue.path.join(".")).filter(Boolean);
  return new Error(`${scope} configuration is missing or invalid: ${invalidNames.join(", ")}`);
}

export function getRazorpayApiConfig(): RazorpayApiConfig {
  const parsed = razorpayApiSchema.safeParse(process.env);
  if (!parsed.success) {
    throw formatEnvironmentError("Razorpay", parsed.error);
  }

  if (parsed.data.RAZORPAY_KEY_ID.startsWith("rzp_live_") && process.env.RAZORPAY_ALLOW_LIVE_MODE !== "true") {
    throw new Error(
      "A live Razorpay key is configured, but RAZORPAY_ALLOW_LIVE_MODE is not explicitly set to true."
    );
  }

  return parsed.data;
}

export function getRazorpayWebhookConfig(): RazorpayWebhookConfig {
  const parsed = razorpayWebhookSchema.safeParse(process.env);
  if (!parsed.success) {
    throw formatEnvironmentError("Razorpay webhook", parsed.error);
  }
  return parsed.data;
}

export function currentPaymentLivemode() {
  return process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live_") ?? false;
}

export function getOptionalAuditIpSecret() {
  const value = process.env.AUDIT_IP_HASH_SECRET?.trim();
  return value && value.length >= 32 ? value : null;
}
