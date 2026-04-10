"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  CreditCard,
  Music,
  Shield,
  ShoppingCart,
  Tag,
  Trash2,
} from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { useStore, type PurchaseOrder } from "@/lib/store-context";
import { cn, formatPrice } from "@/lib/utils";

export default function CartPage() {
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<PurchaseOrder | null>(null);

  const { cart, removeFromCart, checkout } = useStore();

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const discount = promoApplied ? Math.round(subtotal * 0.1) : 0;
    const tax = Math.round((subtotal - discount) * 0.18);
    const total = subtotal - discount + tax;

    return { subtotal, discount, tax, total };
  }, [cart, promoApplied]);

  const itemBreakdown = useMemo(
    () => ({
      track: cart.filter((item) => item.type === "track").length,
      pack: cart.filter((item) => item.type === "pack").length,
      sample: cart.filter((item) => item.type === "sample").length,
    }),
    [cart]
  );

  const applyPromo = () => {
    if (promoCode.trim().toLowerCase() === "keval10") {
      setPromoApplied(true);
    }
  };

  const handleCheckout = () => {
    const order = checkout({
      discountRate: promoApplied ? 0.1 : 0,
      promoCode: promoApplied ? promoCode : undefined,
    });

    if (order) {
      setCompletedOrder(order);
      setPromoCode("");
      setPromoApplied(false);
    }
  };

  if (completedOrder) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-5xl px-6 pt-12 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-8 md:p-10"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-vivid-blue/15 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-vivid-blue" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Purchase complete</h1>
                <p className="text-sm text-muted">
                  Your ownership and license details are ready right away.
                </p>
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_320px] gap-6">
              <div className="space-y-4">
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
                  <h2 className="text-sm font-semibold text-white mb-4">Ownership summary</h2>
                  <div className="space-y-3">
                    {completedOrder.items.map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-white">{item.title}</p>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                                  item.type === "pack"
                                    ? "bg-mid-purple/25 text-light-grey"
                                    : item.type === "sample"
                                      ? "bg-grey-azure/18 text-grey-azure"
                                      : "bg-vivid-blue/12 text-vivid-blue"
                                )}
                              >
                                {item.type}
                              </span>
                            </div>
                            <p className="text-xs text-muted mt-1">{item.artist}</p>
                          </div>
                          <span className="text-xs font-semibold text-dandelion uppercase">
                            {item.license} license
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                          <span className="text-muted">License ID</span>
                          <span className="px-2.5 py-1 rounded-lg bg-vivid-blue/10 text-vivid-blue">
                            {completedOrder.licenses[`${item.type}:${item.id}`]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/account?tab=history"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-vivid-blue to-mid-purple text-white font-semibold hover:shadow-lg hover:shadow-vivid-blue/20 transition-all"
                  >
                    View Purchase History
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.06] text-white font-semibold hover:bg-white/[0.1] transition-all"
                  >
                    Continue Browsing
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 h-fit">
                <h2 className="text-sm font-semibold text-white mb-4">Order receipt</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-muted">
                    <span>Order ID</span>
                    <span>{completedOrder.id}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Subtotal</span>
                    <span>{formatPrice(completedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Discount</span>
                    <span>-{formatPrice(completedOrder.discount)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>GST</span>
                    <span>{formatPrice(completedOrder.tax)}</span>
                  </div>
                  <div className="pt-3 border-t border-white/[0.06] flex justify-between text-white font-semibold">
                    <span>Total Paid</span>
                    <span>{formatPrice(completedOrder.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl px-6 pt-12 pb-16">
        <h1 className="text-3xl font-bold text-white mb-2">Your Cart</h1>
        <p className="text-sm text-muted mb-10">
          {cart.length} {cart.length === 1 ? "item" : "items"} ready for checkout across single-track and full-pack licensing.
        </p>

        {cart.length > 0 ? (
          <div className="grid lg:grid-cols-[1fr_380px] gap-8">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {itemBreakdown.track ? (
                  <span className="rounded-full bg-vivid-blue/12 px-3 py-1 text-xs font-semibold text-vivid-blue">
                    {itemBreakdown.track} single-track {itemBreakdown.track === 1 ? "license" : "licenses"}
                  </span>
                ) : null}
                {itemBreakdown.pack ? (
                  <span className="rounded-full bg-mid-purple/25 px-3 py-1 text-xs font-semibold text-light-grey">
                    {itemBreakdown.pack} full {itemBreakdown.pack === 1 ? "pack" : "packs"}
                  </span>
                ) : null}
                {itemBreakdown.sample ? (
                  <span className="rounded-full bg-grey-azure/18 px-3 py-1 text-xs font-semibold text-grey-azure">
                    {itemBreakdown.sample} sample {itemBreakdown.sample === 1 ? "license" : "licenses"}
                  </span>
                ) : null}
              </div>

              <AnimatePresence mode="popLayout">
                {cart.map((item) => (
                  <motion.div
                    key={`${item.type}-${item.id}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="glass-card rounded-xl p-4 flex items-center gap-4"
                  >
                    <div
                      className={cn(
                        "w-16 h-16 rounded-lg bg-gradient-to-br shrink-0 flex items-center justify-center",
                        item.coverUrl
                      )}
                    >
                      <Music className="w-6 h-6 text-white/60" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white truncate">{item.title}</h3>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            item.type === "pack"
                              ? "bg-mid-purple/30 text-light-grey"
                              : item.type === "sample"
                                ? "bg-grey-azure/20 text-grey-azure"
                                : "bg-vivid-blue/20 text-vivid-blue"
                          )}
                        >
                          {item.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5">{item.artist}</p>
                      <p className="text-[11px] text-muted/70 mt-1">
                        {item.type === "pack"
                          ? "Full pack purchase"
                          : item.type === "track"
                            ? "Single-track license"
                            : "Sample license"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Shield className="w-3 h-3 text-green-400" />
                        <span className="text-[10px] text-green-400 uppercase font-medium tracking-wider">
                          {item.license} license
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-white">{formatPrice(item.price)}</p>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id, item.type)}
                        className="flex items-center gap-1 text-xs text-muted hover:text-zesty-red transition-colors mt-1 ml-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="lg:sticky lg:top-24 h-fit">
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-6">Order Summary</h3>

                <div className="mb-6">
                  <label className="text-xs text-muted font-medium mb-2 block">Promo Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(event) => setPromoCode(event.target.value)}
                      placeholder="Enter code"
                      disabled={promoApplied}
                      className="flex-1 px-3 py-2 rounded-lg glass-subtle bg-transparent text-sm text-white placeholder:text-muted/60 outline-none focus:ring-1 focus:ring-vivid-blue/50 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={applyPromo}
                      disabled={promoApplied || !promoCode}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        promoApplied
                          ? "bg-green-500/20 text-green-400"
                          : "bg-vivid-blue/20 text-vivid-blue hover:bg-vivid-blue hover:text-white disabled:opacity-50"
                      )}
                    >
                      {promoApplied ? <CheckCircle className="w-4 h-4" /> : "Apply"}
                    </button>
                  </div>
                  {promoApplied && (
                    <p className="text-xs text-green-400 mt-1">10% discount applied.</p>
                  )}
                  <p className="text-[10px] text-muted mt-1">Try KEVAL10 for 10% off.</p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-muted">
                    <span>Subtotal ({cart.length} items)</span>
                    <span>{formatPrice(totals.subtotal)}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Promo Discount
                      </span>
                      <span>-{formatPrice(totals.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted">
                    <span>GST (18%)</span>
                    <span>{formatPrice(totals.tax)}</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between text-white font-bold text-base">
                    <span>Total</span>
                    <span>{formatPrice(totals.total)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-vivid-blue to-mid-purple text-white font-semibold text-base hover:shadow-lg hover:shadow-vivid-blue/20 transition-all hover:-translate-y-0.5"
                >
                  <CreditCard className="w-5 h-5" />
                  Complete Purchase
                </button>

                <div className="mt-6 flex flex-col gap-2">
                  {[
                    "Exclusive ownership guaranteed",
                    "Single tracks and full packs can be purchased in one order",
                    "Tracks and packs are removed from the catalog after purchase",
                    "Secure checkout flow with instant confirmation",
                    "Immediate license delivery after payment",
                  ].map((text) => (
                    <div key={text} className="flex items-center gap-2 text-xs text-muted">
                      <CheckCircle className="w-3 h-3 text-green-400 shrink-0" />
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24"
          >
            <div className="w-20 h-20 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="w-8 h-8 text-muted" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Your cart is empty</h2>
            <p className="text-muted mb-8">
              Browse exclusive tracks, packs, and samples to start building your collection.
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-vivid-blue to-mid-purple text-white font-semibold hover:shadow-lg hover:shadow-vivid-blue/20 transition-all"
            >
              Explore Catalog
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
