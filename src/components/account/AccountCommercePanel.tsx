"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Archive,
  Check,
  CreditCard,
  Download,
  ExternalLink,
  FileAudio,
  FileText,
  LoaderCircle,
  MapPin,
  Radio,
  Receipt,
  Save,
  ShieldCheck,
  TestTube2,
} from "lucide-react";
import { downloadTrackPackage } from "@/lib/download-bundle";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import type { RazorpaySubscriptionCheckout } from "@/lib/razorpay-types";
import { cn } from "@/lib/utils";

type CommerceView = "history" | "downloads" | "billing";

type ApiFailure = {
  error?: string;
  message?: string;
  requestId?: string;
};

type OrderHistory = {
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    currency: string;
    subtotalPaise: number;
    taxPaise: number;
    totalPaise: number;
    hostedInvoiceUrl: string | null;
    invoicePdfUrl: string | null;
    paidAt: string | null;
    fulfilledAt: string | null;
    refundedAt: string | null;
    createdAt: string;
    items: Array<{
      id: string;
      trackId: string;
      titleSnapshot: string;
      packTitleSnapshot: string;
      categorySnapshot: string;
      unitAmountPaise: number;
      taxPaise: number;
      totalPaise: number;
      currency: string;
      coverUrl: string | null;
      saleStatus: string;
      license: {
        licenseNumber: string;
        documentStatus: string;
        issuedAt: string | null;
      } | null;
    }>;
  }>;
  nextCursor: string | null;
};

type DownloadLibrary = {
  downloads: Array<{
    orderItemId: string;
    trackId: string;
    title: string;
    packTitle: string;
    category: string;
    coverUrl: string | null;
    order: {
      id: string;
      orderNumber: string;
      fulfilledAt: string | null;
      hostedInvoiceUrl: string | null;
      invoicePdfUrl: string | null;
    };
    assets: {
      mp3: boolean;
      wav: boolean;
      licensePdf: boolean;
      invoice: boolean;
    };
    license: {
      licenseNumber: string;
      documentStatus: string;
      issuedAt: string | null;
    } | null;
  }>;
};

type AccountAccess = {
  environment: "test" | "live";
  subscription: {
    id: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    plan: {
      code: string;
      name: string;
      description: string;
      amountPaise: number;
      currency: string;
      interval: string;
      features: string[];
    };
  } | null;
  streaming: {
    unlimited: boolean;
    lossless: boolean;
    dailyLimit: number;
    usedToday: number;
    remainingToday: number | null;
    resetsAt: string;
  };
};

type PlansResponse = {
  plans: Array<{
    code: string;
    name: string;
    description: string;
    amountPaise: number;
    advertisedAmountPaise: number;
    taxableAmountPaise: number;
    taxPaise: number;
    taxRateBps: number;
    taxMode: "inclusive" | "exclusive";
    sacCode: string;
    currency: string;
    interval: string;
    features: string[];
    available: boolean;
  }>;
};

type BillingProfile = {
  legalName: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  stateName: string;
  stateCode: string | null;
  postalCode: string;
  countryCode: string;
  gstin: string | null;
};

type BillingProfileResponse = {
  profile: BillingProfile | null;
  tax: {
    environment: "test" | "live";
    merchant: { legalName: string; gstin: string };
    track: {
      advertisedPaise: number;
      taxablePaise: number;
      taxPaise: number;
      totalPaise: number;
      ratePercent: number;
      pricingMode: "inclusive" | "exclusive";
      sacCode: string;
    };
    subscription: {
      ratePercent: number;
      pricingMode: "inclusive" | "exclusive";
      sacCode: string;
    };
    reviewedForLive: boolean;
  };
};

type BillingHistory = {
  payments: Array<{
    id: string;
    invoiceNumber: string;
    amountPaise: number;
    taxableAmountPaise: number;
    taxPaise: number;
    currency: string;
    status: string;
    paidAt: string;
    invoiceUrl: string;
    subscription: { plan: { code: string; name: string } };
  }>;
};

const EMPTY_BILLING_PROFILE: BillingProfile = {
  legalName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  stateName: "",
  stateCode: "",
  postalCode: "",
  countryCode: "IN",
  gstin: "",
};

function formatMoney(amountPaise: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountPaise / 100);
}

function formatDate(value: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function readApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
  });
  const body = (await response.json().catch(() => ({}))) as T & ApiFailure;
  if (!response.ok) {
    throw new Error(body.message || "The request could not be completed.");
  }
  return body;
}

function LoadingPanel() {
  return (
    <div className="flex min-h-56 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      <div className="flex items-center gap-3 text-sm text-muted">
        <LoaderCircle className="h-5 w-5 animate-spin text-dandelion" />
        Loading your secure account data
      </div>
    </div>
  );
}

function EmptyPanel({ children }: { children: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] px-5 py-12 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export default function AccountCommercePanel({ view }: { view: CommerceView }) {
  if (view === "history") return <PurchaseHistory />;
  if (view === "downloads") return <SecureDownloads />;
  return <BillingWorkspace />;
}

function PurchaseHistory() {
  const [history, setHistory] = useState<OrderHistory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void readApi<OrderHistory>("/api/account/orders?limit=50", { signal: controller.signal })
      .then(setHistory)
      .catch((failure: unknown) => {
        if (failure instanceof DOMException && failure.name === "AbortError") return;
        setError(failure instanceof Error ? failure.message : "Purchase history is unavailable.");
      });
    return () => controller.abort();
  }, []);

  return (
    <section className="glass rounded-2xl p-6">
      <PanelHeading
        icon={Receipt}
        title="Purchases"
        subtitle="Razorpay-confirmed orders and immutable license records from your KEVAL account."
      />
      {error ? <ErrorNotice message={error} /> : null}
      {!history && !error ? <LoadingPanel /> : null}
      {history && history.orders.length === 0 ? (
        <EmptyPanel>Your completed purchases will appear here after Razorpay confirms payment.</EmptyPanel>
      ) : null}
      {history?.orders.length ? (
        <div className="space-y-4">
          {history.orders.map((order) => (
            <article key={order.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
              <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{order.orderNumber}</p>
                    <StatusPill status={order.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {order.paidAt
                      ? `Paid ${formatDate(order.paidAt)}`
                      : `Created ${formatDate(order.createdAt)}`}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="font-semibold text-dandelion">{formatMoney(order.totalPaise, order.currency)}</p>
                  {order.taxPaise > 0 ? (
                    <p className="mt-1 text-[11px] text-muted">
                      Includes {formatMoney(order.taxPaise, order.currency)} tax
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {order.items.map((item) => (
                  <div key={item.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white/[0.04]">
                      {item.coverUrl ? (
                        <Image src={item.coverUrl} alt="" fill sizes="64px" className="object-cover" />
                      ) : (
                        <FileAudio className="absolute inset-0 m-auto h-5 w-5 text-muted" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">{item.titleSnapshot}</p>
                        <span className="rounded-full bg-dandelion/10 px-2 py-0.5 text-[9px] font-bold uppercase text-dandelion">
                          Licensed
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {item.packTitleSnapshot} | {item.categorySnapshot}
                      </p>
                      <p className="mt-2 text-[11px] text-muted">
                        MP3, WAV master, license PDF, and invoice included
                      </p>
                      {item.license ? (
                        <p className="mt-1 text-[11px] font-medium text-dandelion">
                          License {item.license.licenseNumber}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                      <p className="text-sm font-semibold text-white">
                        {formatMoney(item.totalPaise, item.currency)}
                      </p>
                      <Link
                        href="/account?tab=downloads"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-dandelion transition-colors hover:text-white"
                      >
                        Open files
                        <Download className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              {order.hostedInvoiceUrl || order.invoicePdfUrl ? (
                <a
                  href={order.hostedInvoiceUrl || order.invoicePdfUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-dandelion transition-colors hover:text-white"
                >
                  Open invoice
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function SecureDownloads() {
  const [library, setLibrary] = useState<DownloadLibrary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDownload, setActiveDownload] = useState<string | null>(null);
  const [bundleProgress, setBundleProgress] = useState<{
    itemId: string;
    completed: number;
    total: number;
    label: string;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void readApi<DownloadLibrary>("/api/account/downloads", { signal: controller.signal })
      .then(setLibrary)
      .catch((failure: unknown) => {
        if (failure instanceof DOMException && failure.name === "AbortError") return;
        setError(failure instanceof Error ? failure.message : "Downloads are unavailable.");
      });
    return () => controller.abort();
  }, []);

  const requestDownload = useCallback(async (
    trackId: string,
    assetType: "MP3" | "WAV" | "LICENSE_PDF" | "INVOICE_PDF"
  ) => {
    const actionId = `${trackId}:${assetType}`;
    setActiveDownload(actionId);
    setError(null);
    try {
      const grant = await readApi<{ downloadUrl: string }>("/api/downloads/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId, assetType }),
      });
      window.location.assign(grant.downloadUrl);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The secure download could not start.");
    } finally {
      setActiveDownload(null);
    }
  }, []);

  const requestBundle = useCallback(async (item: DownloadLibrary["downloads"][number]) => {
    if (!item.license) {
      setError("The official license is still being prepared. Try again shortly.");
      return;
    }

    const actionId = `${item.trackId}:BUNDLE`;
    setActiveDownload(actionId);
    setError(null);
    try {
      await downloadTrackPackage({
        trackId: item.trackId,
        title: item.title,
        licenseNumber: item.license.licenseNumber,
        orderNumber: item.order.orderNumber,
        onProgress: (progress) => setBundleProgress({ itemId: item.orderItemId, ...progress }),
      });
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The licensed package could not be prepared."
      );
    } finally {
      setActiveDownload(null);
      setBundleProgress(null);
    }
  }, []);

  return (
    <section className="glass rounded-2xl p-6">
      <PanelHeading
        icon={Download}
        title="Downloads"
        subtitle="Download the complete licensed package as one ZIP, or retrieve any authorized file separately."
      />
      {error ? <ErrorNotice message={error} /> : null}
      {!library && !error ? <LoadingPanel /> : null}
      {library && library.downloads.length === 0 ? (
        <EmptyPanel>Purchased MP3, WAV, license, and invoice files will be delivered here.</EmptyPanel>
      ) : null}
      {library?.downloads.length ? (
        <div className="space-y-4">
          {library.downloads.map((item) => (
            <article key={item.orderItemId} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zesty-red/12 text-zesty-red">
                    {item.coverUrl ? (
                      <Image src={item.coverUrl} alt="" fill sizes="64px" className="object-cover" />
                    ) : (
                      <FileAudio className="absolute inset-0 m-auto h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                      <span className="rounded-full bg-dandelion/10 px-2 py-0.5 text-[9px] font-bold uppercase text-dandelion">
                        4 files ready
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted">{item.packTitle} | {item.category}</p>
                    <p className="mt-2 text-[11px] text-dandelion">
                      {item.license?.licenseNumber || "License preparing"}
                    </p>
                    <p className="mt-1 text-[10px] text-muted/70">
                      Order {item.order.orderNumber} | Fulfilled {formatDate(item.order.fulfilledAt)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => requestBundle(item)}
                  disabled={
                    activeDownload === `${item.trackId}:BUNDLE` ||
                    !item.assets.mp3 ||
                    !item.assets.wav ||
                    !item.assets.licensePdf ||
                    !item.assets.invoice
                  }
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-dandelion px-5 text-sm font-bold text-vampire-black transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {activeDownload === `${item.trackId}:BUNDLE` ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                  {activeDownload === `${item.trackId}:BUNDLE`
                    ? "Preparing package"
                    : "Download complete package"}
                </button>
              </div>

              {bundleProgress?.itemId === item.orderItemId ? (
                <div className="mt-4" aria-live="polite">
                  <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-muted">
                    <span>{bundleProgress.label}</span>
                    <span>{bundleProgress.completed}/{bundleProgress.total}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-dandelion transition-[width] duration-200"
                      style={{
                        width: `${Math.max(
                          5,
                          (bundleProgress.completed / bundleProgress.total) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:max-w-2xl">
                <AssetButton
                  label="MP3"
                  icon={FileAudio}
                  available={item.assets.mp3}
                  loading={activeDownload === `${item.trackId}:MP3`}
                  onClick={() => requestDownload(item.trackId, "MP3")}
                />
                <AssetButton
                  label="WAV"
                  icon={FileAudio}
                  available={item.assets.wav}
                  loading={activeDownload === `${item.trackId}:WAV`}
                  onClick={() => requestDownload(item.trackId, "WAV")}
                />
                <AssetButton
                  label="License"
                  icon={ShieldCheck}
                  available={item.assets.licensePdf}
                  loading={activeDownload === `${item.trackId}:LICENSE_PDF`}
                  onClick={() => requestDownload(item.trackId, "LICENSE_PDF")}
                />
                <AssetButton
                  label="Invoice"
                  icon={Receipt}
                  available={item.assets.invoice}
                  loading={activeDownload === `${item.trackId}:INVOICE_PDF`}
                  onClick={() => requestDownload(item.trackId, "INVOICE_PDF")}
                />
              </div>
              <div className="mt-4 flex items-start gap-2 text-[10px] leading-relaxed text-muted/70">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-dandelion" />
                Every request uses a short-lived, one-use authorization. Private WAV paths are never exposed as public R2 links.
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function BillingWorkspace() {
  const searchParams = useSearchParams();
  const [access, setAccess] = useState<AccountAccess | null>(null);
  const [plans, setPlans] = useState<PlansResponse | null>(null);
  const [billing, setBilling] = useState<BillingProfileResponse | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistory | null>(null);
  const [profileForm, setProfileForm] = useState<BillingProfile>(EMPTY_BILLING_PROFILE);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const requestedPlan = searchParams.get("plan")?.trim().toUpperCase() ?? "";

  const refreshBilling = useCallback(async (signal?: AbortSignal) => {
    const [nextAccess, nextPlans, nextBilling, nextHistory] = await Promise.all([
      readApi<AccountAccess>("/api/account/access", { signal }),
      readApi<PlansResponse>("/api/billing/plans", { signal }),
      readApi<BillingProfileResponse>("/api/account/billing-profile", { signal }),
      readApi<BillingHistory>("/api/account/billing/history", { signal }),
    ]);
    setAccess(nextAccess);
    setPlans(nextPlans);
    setBilling(nextBilling);
    setBillingHistory(nextHistory);
    setProfileForm(nextBilling.profile ?? EMPTY_BILLING_PROFILE);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refreshBilling(controller.signal)
      .catch((failure: unknown) => {
        if (failure instanceof DOMException && failure.name === "AbortError") return;
        setError(failure instanceof Error ? failure.message : "Billing is unavailable.");
      });
    return () => controller.abort();
  }, [refreshBilling]);

  const startCheckout = async (planCode: string) => {
    if (!billing?.profile) {
      setError("Save your billing identity before starting Razorpay checkout.");
      document.getElementById("billing-profile")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setPendingAction(planCode);
    setError(null);
    try {
      const checkout = await readApi<RazorpaySubscriptionCheckout>("/api/billing/subscriptions/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ planCode }),
      });
      const payment = await openRazorpayCheckout(checkout);
      await readApi("/api/billing/subscriptions/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appSubscriptionId: checkout.appSubscriptionId,
          razorpay_subscription_id:
            payment.razorpay_subscription_id ?? checkout.providerSubscriptionId,
          razorpay_payment_id: payment.razorpay_payment_id,
          razorpay_signature: payment.razorpay_signature,
        }),
      });
      await refreshBilling();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Checkout could not start.");
    } finally {
      setPendingAction(null);
    }
  };

  const saveBillingProfile = async () => {
    setPendingAction("billing-profile");
    setError(null);
    try {
      const saved = await readApi<BillingProfileResponse>("/api/account/billing-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      setBilling(saved);
      setProfileForm(saved.profile ?? EMPTY_BILLING_PROFILE);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The billing profile could not be saved.");
    } finally {
      setPendingAction(null);
    }
  };

  const updateProfileField = (field: keyof BillingProfile, value: string) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const cancelSubscription = async () => {
    if (
      !window.confirm(
        "Cancel this subscription at the end of the current billing period? Your access remains active until then."
      )
    ) {
      return;
    }
    setPendingAction("cancel");
    setError(null);
    try {
      await readApi("/api/billing/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelAtPeriodEnd: true }),
      });
      await refreshBilling();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The subscription could not be cancelled.");
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <section className="glass rounded-2xl p-6">
      <PanelHeading
        icon={CreditCard}
        title="Upgrade Plan & Billing"
        subtitle="Razorpay securely processes subscriptions; access is controlled by verified server events."
      />
      {error ? <ErrorNotice message={error} /> : null}
      {!access || !plans || !billing || !billingHistory ? <LoadingPanel /> : null}
      {access && plans && billing && billingHistory ? (
        <>
          <div className="mb-6 grid gap-3 md:grid-cols-3">
            <Metric label="Current plan" value={access.subscription?.plan.name || "Free"} />
            <Metric
              label="Listening today"
              value={access.streaming.unlimited ? "Unlimited" : `${access.streaming.usedToday} / ${access.streaming.dailyLimit}`}
            />
            <Metric
              label="Audio quality"
              value={access.streaming.lossless ? "Lossless WAV" : "MP3 preview"}
            />
          </div>

          {billing.tax.environment === "test" ? (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-dandelion/25 bg-dandelion/[0.06] px-4 py-3 text-sm text-dandelion">
              <TestTube2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Razorpay test mode</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Test payments create test orders, entitlements, and clearly marked test invoices. No real money is charged.
                </p>
              </div>
            </div>
          ) : null}

          <div id="billing-profile" className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 scroll-mt-28">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-white">
                  <MapPin className="h-4 w-4 text-zesty-red" />
                  <h3 className="text-base font-bold">Billing identity</h3>
                </div>
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted">
                  This address is frozen into each paid order or subscription receipt. GSTIN is optional for individual buyers.
                </p>
              </div>
              <span className={cn(
                "w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
                billing.profile ? "bg-dandelion/12 text-dandelion" : "bg-zesty-red/12 text-zesty-red"
              )}>
                {billing.profile ? "Ready for checkout" : "Required before checkout"}
              </span>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <BillingField label="Legal name" value={profileForm.legalName} onChange={(value) => updateProfileField("legalName", value)} />
              <BillingField label="GSTIN (optional)" value={profileForm.gstin ?? ""} onChange={(value) => updateProfileField("gstin", value.toUpperCase())} maxLength={15} />
              <BillingField label="Address line 1" value={profileForm.addressLine1} onChange={(value) => updateProfileField("addressLine1", value)} />
              <BillingField label="Address line 2 (optional)" value={profileForm.addressLine2 ?? ""} onChange={(value) => updateProfileField("addressLine2", value)} />
              <BillingField label="City" value={profileForm.city} onChange={(value) => updateProfileField("city", value)} />
              <BillingField label="State" value={profileForm.stateName} onChange={(value) => updateProfileField("stateName", value)} />
              <BillingField label="GST state code" value={profileForm.stateCode ?? ""} onChange={(value) => updateProfileField("stateCode", value.replace(/\D/g, "").slice(0, 2))} maxLength={2} hint="Karnataka is 29" />
              <BillingField label="Postal code" value={profileForm.postalCode} onChange={(value) => updateProfileField("postalCode", value)} />
            </div>
            <div className="mt-5 flex flex-col gap-4 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-muted">
                ₹99 track price: {formatMoney(billing.tax.track.taxablePaise)} taxable value + {formatMoney(billing.tax.track.taxPaise)} GST = {formatMoney(billing.tax.track.totalPaise)} total. SAC {billing.tax.track.sacCode}.
              </p>
              <button
                type="button"
                onClick={saveBillingProfile}
                disabled={pendingAction === "billing-profile"}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-dandelion px-4 text-sm font-bold text-vampire-black transition-all hover:brightness-105 disabled:opacity-50"
              >
                {pendingAction === "billing-profile" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save billing identity
              </button>
            </div>
          </div>

          {access.subscription ? (
            <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-dandelion/25 bg-dandelion/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-dandelion">
                  <Radio className="h-4 w-4" />
                  <p className="text-sm font-semibold">{access.subscription.plan.name}</p>
                </div>
                <p className="mt-2 text-xs text-muted">
                  {access.subscription.status.replaceAll("_", " ")} | {access.subscription.cancelAtPeriodEnd ? "Ends" : "Renews"} {formatDate(access.subscription.currentPeriodEnd)}
                </p>
              </div>
              <button
                type="button"
                onClick={cancelSubscription}
                disabled={pendingAction === "cancel" || access.subscription.cancelAtPeriodEnd}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-dandelion px-4 text-sm font-semibold text-vampire-black transition-all hover:brightness-105 disabled:opacity-50"
              >
                {pendingAction === "cancel" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {access.subscription.cancelAtPeriodEnd ? "Cancellation scheduled" : "Cancel at period end"}
              </button>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
            {plans.plans.map((plan) => {
              const current = access.subscription?.plan.code === plan.code;
              const requested = requestedPlan === plan.code;
              return (
                <article
                  key={plan.code}
                  className={cn(
                    "flex min-h-[410px] flex-col rounded-2xl border p-5 transition-colors",
                    current
                      ? "border-dandelion/45 bg-dandelion/[0.055]"
                      : requested
                        ? "border-zesty-red/55 bg-zesty-red/[0.055]"
                      : "border-white/[0.07] bg-white/[0.025]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-white">{plan.name}</p>
                      <p className="mt-3 text-2xl font-bold text-dandelion">
                        {formatMoney(plan.amountPaise, plan.currency)}
                        <span className="ml-1 text-xs font-medium text-muted">/{plan.interval}</span>
                      </p>
                      <p className="mt-1 text-[10px] text-muted">
                        Includes {formatMoney(plan.taxPaise, plan.currency)} GST | SAC {plan.sacCode}
                      </p>
                    </div>
                    {current ? (
                      <span className="rounded-full bg-dandelion px-2 py-1 text-[10px] font-bold uppercase text-vampire-black">
                        Current
                      </span>
                    ) : requested ? (
                      <span className="rounded-full bg-zesty-red px-2 py-1 text-[10px] font-bold uppercase text-white">
                        Selected
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted">{plan.description}</p>
                  <ul className="mt-5 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2 text-xs leading-relaxed text-light-grey/80">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zesty-red" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => startCheckout(plan.code)}
                    disabled={current || Boolean(access.subscription) || !plan.available || pendingAction === plan.code}
                    className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-dandelion px-4 text-sm font-semibold text-vampire-black transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-muted"
                  >
                    {pendingAction === plan.code ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    {current
                      ? "Current plan"
                      : access.subscription
                        ? "Manage current plan"
                        : plan.available
                          ? `Choose ${plan.name}`
                          : "Checkout setup pending"}
                  </button>
                </article>
              );
            })}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-muted">
            Plans renew monthly until cancelled. Access is granted only after Razorpay confirms the subscription and Keval verifies the signed callback or webhook on the server.
          </p>
          <div className="mt-8 border-t border-white/[0.07] pt-6">
            <div className="mb-4 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-zesty-red" />
              <h3 className="text-base font-bold text-white">Subscription invoices</h3>
            </div>
            {billingHistory.payments.length === 0 ? (
              <EmptyPanel>Verified subscription charges and downloadable invoices will appear here.</EmptyPanel>
            ) : (
              <div className="space-y-2">
                {billingHistory.payments.map((payment) => (
                  <div key={payment.id} className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{payment.subscription.plan.name}</p>
                      <p className="mt-1 text-[11px] text-muted">
                        {payment.invoiceNumber} | Paid {formatDate(payment.paidAt)} | GST {formatMoney(payment.taxPaise, payment.currency)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-bold text-dandelion">{formatMoney(payment.amountPaise, payment.currency)}</p>
                      <a
                        href={payment.invoiceUrl}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.09] bg-white/[0.04] px-3 text-xs font-semibold text-white transition-colors hover:border-dandelion/40 hover:text-dandelion"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Invoice
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}

function BillingField({
  label,
  value,
  onChange,
  maxLength,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold text-light-grey/80">
        {label}
        {hint ? <span className="font-normal text-muted/70">{hint}</span> : null}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        autoComplete="billing street-address"
        className="h-11 w-full rounded-lg border border-white/[0.09] bg-vampire-black/45 px-3 text-sm text-white outline-none transition-colors placeholder:text-muted/40 focus:border-dandelion/55"
      />
    </label>
  );
}

function PanelHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Receipt;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zesty-red/12 text-zesty-red">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const positive = status === "FULFILLED" || status === "PAID";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
        positive ? "bg-dandelion/12 text-dandelion" : "bg-zesty-red/12 text-zesty-red"
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function AssetButton({
  label,
  icon: Icon,
  available,
  loading = false,
  onClick,
}: {
  label: string;
  icon: typeof FileText;
  available: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!available || loading}
      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 text-xs font-semibold text-white transition-colors hover:border-dandelion/40 hover:text-dandelion disabled:cursor-not-allowed disabled:opacity-35"
    >
      {loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
      <p className="text-[10px] font-semibold uppercase text-muted">{label}</p>
      <p className="mt-2 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div role="alert" className="mb-5 rounded-xl border border-zesty-red/30 bg-zesty-red/[0.08] px-4 py-3 text-sm text-zesty-red">
      {message}
    </div>
  );
}
