"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  CreditCard,
  LoaderCircle,
  Music,
  Shield,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import type { RazorpayTrackCheckout } from "@/lib/razorpay-types";
import { useStore } from "@/lib/store-context";
import { cn, formatPrice } from "@/lib/utils";

type ApiFailure = {
  error?: string;
  message?: string;
};

function createIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export default function CartPage() {
  const router = useRouter();
  const { cart, removeFromCart, clearCart } = useStore();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const checkoutKeyRef = useRef(createIdempotencyKey());

  const trackItems = useMemo(() => cart.filter((item) => item.type === "track"), [cart]);
  const unsupportedItems = useMemo(() => cart.filter((item) => item.type !== "track"), [cart]);
  const subtotal = trackItems.length * 99;

  const handleCheckout = async () => {
    if (!trackItems.length || unsupportedItems.length || isCheckingOut) return;
    setIsCheckingOut(true);
    setCheckoutError(null);

    try {
      const response = await fetch("/api/checkout/sessions", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": checkoutKeyRef.current,
        },
        body: JSON.stringify({
          mode: "tracks",
          trackIds: trackItems.map((item) => item.id),
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | (RazorpayTrackCheckout & ApiFailure)
        | null;
      if (!response.ok || body?.provider !== "razorpay" || body.flow !== "track_purchase") {
        throw new Error(body?.message || "Checkout could not be started. Please try again.");
      }
      const payment = await openRazorpayCheckout(body);
      const verification = await fetch("/api/checkout/razorpay/verify", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appOrderId: body.appOrderId,
          razorpay_order_id: payment.razorpay_order_id ?? body.providerOrderId,
          razorpay_payment_id: payment.razorpay_payment_id,
          razorpay_signature: payment.razorpay_signature,
        }),
      });
      const verificationBody = (await verification.json().catch(() => null)) as ApiFailure | null;
      if (!verification.ok) {
        throw new Error(
          verificationBody?.message ||
            "Payment was received but confirmation is still pending. Check Purchases shortly."
        );
      }
      clearCart();
      router.push("/account?tab=history&checkout=success");
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Checkout could not be started. Please try again."
      );
      setIsCheckingOut(false);
    }
  };

  return (
    <PageTransition>
      <div className="pt-8 pb-20">
        <h1 className="text-3xl font-bold text-white mb-2">Your Cart</h1>
        <p className="text-sm text-muted mb-8">
          Review your exclusive track licenses before secure checkout.
        </p>

        {cart.length > 0 ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-3">
              {unsupportedItems.length > 0 ? (
                <div className="flex items-start gap-3 rounded-lg border border-dandelion/30 bg-dandelion/8 p-4 text-sm text-dandelion">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Checkout currently supports individual songs only. Remove pack or sample items to continue.
                  </p>
                </div>
              ) : null}

              <AnimatePresence mode="popLayout">
                {cart.map((item) => (
                  <motion.div
                    key={`${item.type}-${item.id}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -80 }}
                    transition={{ duration: 0.22 }}
                    className="glass-card flex items-center gap-4 rounded-lg p-4"
                  >
                    <div
                      className={cn(
                        "flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br",
                        item.coverUrl
                      )}
                    >
                      {item.coverUrl?.startsWith("/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.coverUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Music className="h-6 w-6 text-white/60" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-sm font-semibold text-white">{item.title}</h2>
                        <span className="rounded-full bg-dandelion/12 px-2 py-0.5 text-[10px] font-bold uppercase text-dandelion">
                          {item.type}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">{item.artist}</p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-dandelion">
                        <Shield className="h-3 w-3" />
                        Exclusive license
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold text-white">
                        {item.type === "track" ? formatPrice(99) : formatPrice(item.price)}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id, item.type)}
                        className="ml-auto mt-1 flex items-center gap-1 text-xs text-muted transition-colors hover:text-zesty-red"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <aside className="h-fit lg:sticky lg:top-24">
              <div className="glass rounded-lg p-6">
                <h2 className="mb-6 text-lg font-bold text-white">Order Summary</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-muted">
                    <span>{trackItems.length} licensed {trackItems.length === 1 ? "song" : "songs"}</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Delivery</span>
                    <span>Digital</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Secure payment</span>
                    <span>Razorpay</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-3 text-base font-bold text-white">
                    <span>Total</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                </div>

                {checkoutError ? (
                  <div role="alert" className="mt-5 flex items-start gap-2 rounded-md border border-zesty-red/30 bg-zesty-red/8 p-3 text-xs text-zesty-red">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{checkoutError}</span>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={!trackItems.length || unsupportedItems.length > 0 || isCheckingOut}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-dandelion px-6 py-4 text-base font-semibold text-vampire-black transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isCheckingOut ? (
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                  ) : (
                    <CreditCard className="h-5 w-5" />
                  )}
                  {isCheckingOut ? "Opening secure checkout..." : "Continue to Razorpay"}
                </button>

                <div className="mt-6 space-y-2">
                  {[
                    "The server rechecks price and availability",
                    "Payment is processed securely by Razorpay",
                    "One MP3, one WAV, a license PDF, and an invoice after payment",
                    "Purchased songs become sold out for future buyers",
                  ].map((text) => (
                    <div key={text} className="flex items-start gap-2 text-xs text-muted">
                      <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-dandelion" />
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-24 text-center"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/[0.04]">
              <ShoppingCart className="h-8 w-8 text-muted" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-white">Your cart is empty</h2>
            <p className="mb-8 text-muted">Find a song, preview it, and add its exclusive license here.</p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 rounded-lg bg-dandelion px-6 py-3 font-semibold text-vampire-black transition-all hover:brightness-105"
            >
              Explore Catalog
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
