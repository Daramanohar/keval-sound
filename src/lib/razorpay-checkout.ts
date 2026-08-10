"use client";

import type {
  RazorpayCheckout,
  RazorpayPaymentSuccess,
} from "@/lib/razorpay-types";

type RazorpayFailure = {
  error?: {
    code?: string;
    description?: string;
    reason?: string;
  };
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id?: string;
  subscription_id?: string;
  handler: (response: RazorpayPaymentSuccess) => void;
  prefill: RazorpayCheckout["prefill"];
  notes: Record<string, string>;
  theme: {
    color: string;
    backdrop_color: string;
  };
  timeout: number;
  retry: { enabled: boolean };
  modal: {
    confirm_close: boolean;
    escape: boolean;
    ondismiss: () => void;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailure) => void) => void;
};

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
let checkoutScriptPromise: Promise<RazorpayConstructor> | null = null;

function loadCheckoutScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay Checkout is available only in the browser."));
  }
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (checkoutScriptPromise) return checkoutScriptPromise;

  checkoutScriptPromise = new Promise<RazorpayConstructor>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CHECKOUT_SCRIPT_URL}"]`
    );
    const script = existing ?? document.createElement("script");

    const cleanup = () => {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };
    const handleLoad = () => {
      cleanup();
      if (!window.Razorpay) {
        checkoutScriptPromise = null;
        reject(new Error("Razorpay Checkout did not initialize."));
        return;
      }
      resolve(window.Razorpay);
    };
    const handleError = () => {
      cleanup();
      checkoutScriptPromise = null;
      reject(new Error("Razorpay Checkout could not be loaded. Check your connection and try again."));
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    if (!existing) {
      script.src = CHECKOUT_SCRIPT_URL;
      script.async = true;
      script.dataset.kevalRazorpay = "checkout";
      document.head.appendChild(script);
    }
  });

  return checkoutScriptPromise;
}

export async function openRazorpayCheckout(
  checkout: RazorpayCheckout
): Promise<RazorpayPaymentSuccess> {
  const Razorpay = await loadCheckoutScript();

  return new Promise<RazorpayPaymentSuccess>((resolve, reject) => {
    let settled = false;
    let lastFailureMessage: string | null = null;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      callback();
    };
    const options: RazorpayOptions = {
      key: checkout.keyId,
      amount: checkout.amount,
      currency: checkout.currency,
      name: checkout.name,
      description: checkout.description,
      ...(checkout.image ? { image: checkout.image } : {}),
      ...(checkout.flow === "track_purchase"
        ? { order_id: checkout.providerOrderId }
        : { subscription_id: checkout.providerSubscriptionId }),
      handler: (response) => finish(() => resolve(response)),
      prefill: checkout.prefill,
      notes: checkout.notes,
      theme: {
        color: checkout.theme.color,
        backdrop_color: checkout.theme.backdropColor,
      },
      timeout: checkout.timeoutSeconds,
      retry: { enabled: true },
      modal: {
        confirm_close: true,
        escape: true,
        ondismiss: () =>
          finish(() =>
            reject(
              new Error(
                lastFailureMessage ?? "Checkout was closed before payment completed."
              )
            )
          ),
      },
    };
    const instance = new Razorpay(options);
    instance.on("payment.failed", (response) => {
      const message =
        response.error?.description ||
        response.error?.reason ||
        "Razorpay could not complete the payment. Try another method or try again.";
      // Razorpay keeps Checkout open so the customer can retry. Reject only if
      // they ultimately dismiss the modal without a successful callback.
      lastFailureMessage = message;
    });
    instance.open();
  });
}
