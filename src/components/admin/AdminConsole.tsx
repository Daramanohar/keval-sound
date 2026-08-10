"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CreditCard,
  LoaderCircle,
  Receipt,
  RefreshCw,
  RotateCcw,
  Users,
  Webhook,
  X,
} from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { cn } from "@/lib/utils";

type Overview = {
  environment: "test" | "live";
  generatedAt: string;
  summary: {
    users: number;
    paidOrders: number;
    activeSubscriptions: number;
    failedWebhooks: number;
    capturedRevenuePaise: number;
    currency: string;
  };
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalPaise: number;
    taxPaise: number;
    currency: string;
    createdAt: string;
    user: { kevalUserId: string; email: string | null; firstName: string | null; lastName: string | null };
    items: Array<{ titleSnapshot: string }>;
    refunds: Array<{ status: string; amountPaise: number }>;
  }>;
  users: Array<{
    id: string;
    kevalUserId: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    role: string;
    createdAt: string;
  }>;
  subscriptions: Array<{
    id: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    user: { kevalUserId: string; email: string | null };
    plan: { code: string; name: string; amountPaise: number; currency: string };
  }>;
  failedWebhooks: Array<{
    id: string;
    eventType: string;
    objectId: string | null;
    attempts: number;
    lastError: string | null;
    updatedAt: string;
  }>;
};

type Tab = "orders" | "users" | "subscriptions" | "webhooks";

function money(paise: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

function date(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Not available";
}

async function api<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...init });
  const body = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) throw new Error(body.message || "The operation could not be completed.");
  return body;
}

export default function AdminConsole() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tab, setTab] = useState<Tab>("orders");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refundOrder, setRefundOrder] = useState<Overview["orders"][number] | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await api<Overview>("/api/admin/overview"));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Operations data is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void refresh(), [refresh]);

  const submitRefund = async () => {
    if (!refundOrder || refundReason.trim().length < 5) return;
    setRefunding(true);
    setError(null);
    try {
      await api(`/api/admin/orders/${refundOrder.id}/refunds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ reason: refundReason.trim() }),
      });
      setRefundOrder(null);
      setRefundReason("");
      await refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The refund could not be requested.");
    } finally {
      setRefunding(false);
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof Receipt }> = [
    { id: "orders", label: "Orders & refunds", icon: Receipt },
    { id: "users", label: "Users", icon: Users },
    { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
    { id: "webhooks", label: "Webhook failures", icon: Webhook },
  ];

  return (
    <PageTransition>
      <main className="min-h-full px-5 pb-28 pt-6 md:px-8">
        <div className="flex flex-col gap-4 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-white">Operations Console</h1>
              {overview ? (
                <span className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
                  overview.environment === "live" ? "bg-dandelion text-vampire-black" : "bg-zesty-red/15 text-zesty-red"
                )}>
                  {overview.environment}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-muted">Server-owned views for payments, customers, subscriptions, and Razorpay delivery health.</p>
          </div>
          <button type="button" onClick={refresh} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/[0.09] bg-white/[0.04] px-4 text-sm font-semibold text-white hover:border-dandelion/40 disabled:opacity-50">
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>

        {error ? <div role="alert" className="mt-5 rounded-xl border border-zesty-red/30 bg-zesty-red/[0.08] px-4 py-3 text-sm text-zesty-red">{error}</div> : null}
        {loading && !overview ? <div className="flex min-h-80 items-center justify-center text-sm text-muted"><LoaderCircle className="mr-3 h-5 w-5 animate-spin text-dandelion" />Loading operations data</div> : null}
        {overview ? (
          <>
            <div className="grid grid-cols-2 gap-3 py-6 lg:grid-cols-5">
              <Metric label="Captured revenue" value={money(overview.summary.capturedRevenuePaise, overview.summary.currency)} />
              <Metric label="Paid orders" value={String(overview.summary.paidOrders)} />
              <Metric label="Active plans" value={String(overview.summary.activeSubscriptions)} />
              <Metric label="Users" value={String(overview.summary.users)} />
              <Metric label="Webhook failures" value={String(overview.summary.failedWebhooks)} alert={overview.summary.failedWebhooks > 0} />
            </div>
            <div className="flex gap-2 overflow-x-auto border-b border-white/[0.07] pb-3">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setTab(id)} className={cn("inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold", tab === id ? "bg-dandelion text-vampire-black" : "bg-white/[0.04] text-muted hover:text-white")}>
                  <Icon className="h-4 w-4" />{label}
                </button>
              ))}
            </div>
            <section className="pt-5">
              {tab === "orders" ? <OrdersTable orders={overview.orders} onRefund={setRefundOrder} /> : null}
              {tab === "users" ? <UsersTable users={overview.users} /> : null}
              {tab === "subscriptions" ? <SubscriptionsTable subscriptions={overview.subscriptions} /> : null}
              {tab === "webhooks" ? <WebhooksTable events={overview.failedWebhooks} /> : null}
            </section>
          </>
        ) : null}
      </main>

      {refundOrder ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="refund-title">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#111322] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="refund-title" className="text-xl font-bold text-white">Request full refund</h2><p className="mt-2 text-sm text-muted">{refundOrder.orderNumber} | {money(refundOrder.totalPaise, refundOrder.currency)}</p></div>
              <button type="button" onClick={() => setRefundOrder(null)} aria-label="Close refund dialog" className="rounded-lg p-2 text-muted hover:bg-white/[0.06] hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <label className="mt-5 block text-xs font-semibold text-light-grey">Internal refund reason</label>
            <textarea value={refundReason} onChange={(event) => setRefundReason(event.target.value)} rows={4} maxLength={500} className="mt-2 w-full rounded-lg border border-white/[0.1] bg-vampire-black/60 p-3 text-sm text-white outline-none focus:border-dandelion/50" />
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setRefundOrder(null)} className="h-10 rounded-lg px-4 text-sm font-semibold text-muted hover:text-white">Cancel</button>
              <button type="button" onClick={submitRefund} disabled={refundReason.trim().length < 5 || refunding} className="inline-flex h-10 items-center gap-2 rounded-lg bg-zesty-red px-4 text-sm font-bold text-white disabled:opacity-45">{refunding ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}Request refund</button>
            </div>
          </div>
        </div>
      ) : null}
    </PageTransition>
  );
}

function Metric({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"><p className="text-[10px] font-semibold uppercase text-muted">{label}</p><p className={cn("mt-2 text-xl font-bold", alert ? "text-zesty-red" : "text-white")}>{value}</p></div>;
}

function TableShell({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-white/[0.07]"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-white/[0.04] text-muted"><tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-semibold uppercase">{header}</th>)}</tr></thead><tbody className="divide-y divide-white/[0.06]">{children}</tbody></table></div>;
}

function OrdersTable({ orders, onRefund }: { orders: Overview["orders"]; onRefund: (order: Overview["orders"][number]) => void }) {
  return <TableShell headers={["Order", "Customer", "Items", "Status", "Total", "Created", "Action"]}>{orders.map((order) => <tr key={order.id} className="bg-white/[0.012]"><td className="px-4 py-3 font-semibold text-white">{order.orderNumber}</td><td className="px-4 py-3 text-muted">{order.user.email || order.user.kevalUserId}</td><td className="max-w-64 px-4 py-3 text-muted">{order.items.map((item) => item.titleSnapshot).join(", ")}</td><td className="px-4 py-3 text-dandelion">{order.status.replaceAll("_", " ")}</td><td className="px-4 py-3 font-semibold text-white">{money(order.totalPaise, order.currency)}</td><td className="px-4 py-3 text-muted">{date(order.createdAt)}</td><td className="px-4 py-3">{order.status === "FULFILLED" && order.refunds.length === 0 ? <button type="button" onClick={() => onRefund(order)} className="inline-flex items-center gap-1.5 font-semibold text-zesty-red hover:text-white"><RotateCcw className="h-3.5 w-3.5" />Refund</button> : <span className="text-muted">{order.refunds[0]?.status || "-"}</span>}</td></tr>)}</TableShell>;
}

function UsersTable({ users }: { users: Overview["users"] }) {
  return <TableShell headers={["KEVAL ID", "Name", "Email", "Role", "Joined"]}>{users.map((user) => <tr key={user.id}><td className="px-4 py-3 font-semibold text-dandelion">{user.kevalUserId}</td><td className="px-4 py-3 text-white">{[user.firstName, user.lastName].filter(Boolean).join(" ") || "Not supplied"}</td><td className="px-4 py-3 text-muted">{user.email || "Not supplied"}</td><td className="px-4 py-3 text-muted">{user.role}</td><td className="px-4 py-3 text-muted">{date(user.createdAt)}</td></tr>)}</TableShell>;
}

function SubscriptionsTable({ subscriptions }: { subscriptions: Overview["subscriptions"] }) {
  return <TableShell headers={["Customer", "Plan", "Status", "Amount", "Period end", "Renewal"]}>{subscriptions.map((entry) => <tr key={entry.id}><td className="px-4 py-3 text-muted">{entry.user.email || entry.user.kevalUserId}</td><td className="px-4 py-3 font-semibold text-white">{entry.plan.name}</td><td className="px-4 py-3 text-dandelion">{entry.status}</td><td className="px-4 py-3 text-white">{money(entry.plan.amountPaise, entry.plan.currency)}</td><td className="px-4 py-3 text-muted">{date(entry.currentPeriodEnd)}</td><td className="px-4 py-3 text-muted">{entry.cancelAtPeriodEnd ? "Cancellation scheduled" : "Automatic"}</td></tr>)}</TableShell>;
}

function WebhooksTable({ events }: { events: Overview["failedWebhooks"] }) {
  if (events.length === 0) return <div className="rounded-xl border border-dandelion/20 bg-dandelion/[0.04] px-5 py-10 text-center text-sm text-dandelion">No failed Razorpay webhooks in this environment.</div>;
  return <TableShell headers={["Event", "Object", "Attempts", "Last error", "Updated"]}>{events.map((event) => <tr key={event.id}><td className="px-4 py-3 font-semibold text-white">{event.eventType}</td><td className="px-4 py-3 text-muted">{event.objectId || "-"}</td><td className="px-4 py-3 text-zesty-red">{event.attempts}</td><td className="max-w-md px-4 py-3 text-muted"><span className="inline-flex items-start gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zesty-red" />{event.lastError || "No error detail"}</span></td><td className="px-4 py-3 text-muted">{date(event.updatedAt)}</td></tr>)}</TableShell>;
}
