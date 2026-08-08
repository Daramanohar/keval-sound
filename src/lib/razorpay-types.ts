export type RazorpayPaymentSuccess = {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature: string;
};

type RazorpayCheckoutBase = {
  provider: "razorpay";
  keyId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  prefill: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes: Record<string, string>;
  theme: {
    color: string;
    backdropColor: string;
  };
  timeoutSeconds: number;
};

export type RazorpayTrackCheckout = RazorpayCheckoutBase & {
  flow: "track_purchase";
  appOrderId: string;
  providerOrderId: string;
};

export type RazorpaySubscriptionCheckout = RazorpayCheckoutBase & {
  flow: "subscription";
  appSubscriptionId: string;
  providerSubscriptionId: string;
  planCode: string;
};

export type RazorpayCheckout = RazorpayTrackCheckout | RazorpaySubscriptionCheckout;
