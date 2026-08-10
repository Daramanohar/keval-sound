"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  CreditCard,
  Download,
  ExternalLink,
  Headphones,
  Heart,
  Library,
  Monitor,
  Play,
  Receipt,
  Settings,
  Shield,
  Sparkles,
  User,
} from "lucide-react";
import PageTransition from "@/components/PageTransition";
import AccountCommercePanel from "@/components/account/AccountCommercePanel";
import LikedSongsPanel from "@/components/account/LikedSongsPanel";
import { useAuth } from "@/lib/auth-context";
import { useLikedSongs } from "@/lib/liked-songs-context";
import { usePlayerControls } from "@/lib/player-context";
import { findTrackById, useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";
import { cn, formatPrice } from "@/lib/utils";

const workspaceTabs = [
  { id: "liked", label: "Liked Songs", icon: Heart },
  { id: "recent", label: "Recently Played", icon: Library },
  { id: "history", label: "Purchases", icon: Receipt },
  { id: "downloads", label: "Downloads", icon: Download },
  { id: "billing", label: "Plans & Billing", icon: CreditCard },
];

const allTabs = new Set([
  "profile",
  "billing",
  "history",
  "liked",
  "wishlist",
  "settings",
  "licensing",
  "support",
  "desktop",
  "legal",
  "recent",
  "downloads",
]);

export default function AccountPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [kevalUserId, setKevalUserId] = useState<string | null>(null);
  const [membership, setMembership] = useState<{
    planName: string;
    isPaid: boolean;
    lossless: boolean;
    remainingToday: number | null;
  } | null>(null);
  const [purchaseSummary, setPurchaseSummary] = useState<{
    ownedAssets: number;
    latestOrderNumber: string | null;
  } | null>(null);
  const { isInCart, isOwned, addTrackToCart } = useStore();
  const { likedCount } = useLikedSongs();
  const { recentlyPlayed, toggleTrack } = usePlayerControls();
  const { showToast } = useToast();

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/account/profile", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("profile_unavailable");
        return response.json() as Promise<{ kevalUserId?: string }>;
      })
      .then((profile) => setKevalUserId(profile.kevalUserId ?? null))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setKevalUserId(null);
      });

    void fetch("/api/account/access", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("access_unavailable");
        return response.json() as Promise<{
          subscription?: { plan?: { name?: string } } | null;
          streaming?: { lossless?: boolean; remainingToday?: number | null };
        }>;
      })
      .then((access) => {
        const planName = access.subscription?.plan?.name?.trim() || "Free";
        setMembership({
          planName,
          isPaid: Boolean(access.subscription),
          lossless: Boolean(access.streaming?.lossless),
          remainingToday: access.streaming?.remainingToday ?? null,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMembership(null);
      });

    void fetch("/api/account/orders?limit=50", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("orders_unavailable");
        return response.json() as Promise<{
          orders?: Array<{ orderNumber?: string; items?: unknown[] }>;
        }>;
      })
      .then((history) => {
        const serverOrders = history.orders ?? [];
        setPurchaseSummary({
          ownedAssets: serverOrders.reduce((total, order) => total + (order.items?.length ?? 0), 0),
          latestOrderNumber: serverOrders[0]?.orderNumber ?? null,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPurchaseSummary(null);
      });

    return () => controller.abort();
  }, []);

  const handleRecentTrackAdd = (trackId: string) => {
    const track = findTrackById(trackId);
    if (!track) return;

    if (isOwned(track.id, "track")) {
      showToast({
        tone: "info",
        title: `${track.title} is already owned`,
        description: "Open Purchases to review your ownership and license details.",
      });
      return;
    }

    const added = addTrackToCart(track);

    showToast(
      added
        ? {
            title: `${track.title} added to cart`,
            description: `${track.artist} · ${formatPrice(track.price)}`,
          }
        : {
            tone: "info",
            title: `${track.title} is already in your cart`,
            description: "Complete checkout anytime from the cart.",
          }
    );
  };

  const requestedTab = searchParams.get("tab") ?? "";
  const activeTab = requestedTab === "wishlist"
    ? "liked"
    : allTabs.has(requestedTab)
      ? requestedTab
      : "liked";

  const libraryStats = useMemo(
    () => [
      { label: "Liked", value: likedCount, tone: "text-zesty-red" },
      { label: "Recently Played", value: recentlyPlayed.length, tone: "text-dandelion" },
      { label: "Owned Assets", value: purchaseSummary?.ownedAssets ?? 0, tone: "text-white" },
      {
        label: "Latest Order",
        value: purchaseSummary?.latestOrderNumber ?? "None",
        tone: "text-grey-azure",
      },
    ],
    [likedCount, purchaseSummary, recentlyPlayed.length]
  );

  return (
    <PageTransition>
      <div className="pb-16 pt-4">
        <section className="glass mb-8 overflow-hidden rounded-3xl p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-vivid-blue to-mid-purple text-xl font-bold text-white",
                    membership?.isPaid && "border-2 border-dandelion shadow-[0_0_24px_rgba(255,235,153,0.2)]"
                  )}
                >
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{user?.name}</p>
                  <p className="text-xs text-muted">{user?.email}</p>
                </div>
                <span
                  className={cn(
                    "ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider lg:ml-0",
                    membership?.isPaid
                      ? "bg-dandelion/12 text-dandelion"
                      : "bg-vivid-blue/10 text-vivid-blue"
                  )}
                >
                  <BadgeCheck className="h-3 w-3" />
                  {membership?.planName || "Member"}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-white">Your Library Workspace</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                Manage Liked Songs, recent previews, purchases, downloads, and playlists from one focused workspace.
              </p>
              <Link
                href="/account?tab=billing"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-dandelion px-4 py-2.5 text-sm font-bold text-vampire-black transition-all hover:brightness-105"
              >
                <CreditCard className="h-4 w-4" />
                View plans and billing
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {libraryStats.map((stat) => (
                <div
                  key={stat.label}
                  className="min-w-0 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3"
                >
                  <p className="text-[10px] uppercase tracking-wider text-muted/60">{stat.label}</p>
                  <p className={cn(
                    "mt-2 font-bold break-all",
                    stat.label === "Latest Order" ? "text-sm" : "text-lg",
                    stat.tone
                  )}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mb-8 flex flex-wrap gap-2">
          {workspaceTabs.map((tab) => (
            <Link
              key={tab.id}
              href={`/account?tab=${tab.id}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-vivid-blue text-white shadow-lg shadow-vivid-blue/20"
                  : "glass-subtle text-muted hover:bg-white/[0.08] hover:text-white"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          ))}
        </div>

        <div className="space-y-6">
          {activeTab === "liked" && <LikedSongsPanel />}

          {activeTab === "recent" && (
            <section className="glass rounded-2xl p-6">
              <SectionTitle
                title="Recently Played"
                subtitle="Tracks you previewed while browsing the KEVAL SOUND catalog."
              />
              {recentlyPlayed.length ? (
                <div className="space-y-3">
                  {recentlyPlayed.map((item) => {
                    const sourceTrack = findTrackById(item.id);

                    return (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 md:flex-row md:items-center"
                      >
                        <div className={cn("h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br", item.coverUrl)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">{item.title}</p>
                            <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">
                              {item.sourcePackTitle ?? "Single preview"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted">{item.artist}</p>
                          <p className="mt-2 text-[11px] text-muted/70">
                            Previewed on {new Date(item.playedAt).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {sourceTrack ? (
                            <button
                              type="button"
                              onClick={() => toggleTrack(sourceTrack)}
                              className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.1]"
                            >
                              <Play className="h-4 w-4" />
                              Preview Again
                            </button>
                          ) : null}
                          {sourceTrack ? (
                            <button
                              type="button"
                              onClick={() => handleRecentTrackAdd(sourceTrack.id)}
                              className={cn(
                                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                                isInCart(sourceTrack.id, "track")
                                  ? "bg-vivid-blue text-white"
                                  : "bg-vivid-blue/10 text-vivid-blue hover:bg-vivid-blue/20"
                              )}
                            >
                              <Sparkles className="h-4 w-4" />
                              {isInCart(sourceTrack.id, "track") ? "In Cart" : "Add to Cart"}
                            </button>
                          ) : (
                            <Link
                              href={item.sourcePackId ? `/pack/${item.sourcePackId}` : "/explore"}
                              className="inline-flex items-center gap-2 rounded-xl bg-vivid-blue/10 px-4 py-2.5 text-sm font-semibold text-vivid-blue transition-colors hover:bg-vivid-blue/20"
                            >
                              Open Source
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState text="Start previewing songs and your recent listening history will show up here." />
              )}
            </section>
          )}

          {activeTab === "history" && (
            <AccountCommercePanel view="history" />
          )}

          {activeTab === "downloads" && (
            <AccountCommercePanel view="downloads" />
          )}

          {activeTab === "profile" && (
            <SimplePanel
              title="Profile"
              subtitle="Your identity and creator details for KEVAL SOUND."
              icon={User}
            >
              <InfoGrid
                items={[
                  { label: "Display name", value: user?.name ?? "Unknown" },
                  { label: "Email", value: user?.email ?? "Unknown" },
                  { label: "KEVAL USER ID", value: kevalUserId ?? "Assigning securely..." },
                  { label: "Member tier", value: membership?.planName ?? "Free" },
                  {
                    label: "Streaming access",
                    value: !membership
                      ? "Checking allowance..."
                      : membership.lossless
                        ? "Unlimited lossless WAV"
                        : membership.remainingToday === null
                          ? "Unlimited streaming"
                          : `${membership.remainingToday} free streams remaining today`,
                  },
                  {
                    label: "Latest order",
                    value: purchaseSummary?.latestOrderNumber ?? "No purchases yet",
                  },
                ]}
              />
            </SimplePanel>
          )}

          {activeTab === "billing" && (
            <AccountCommercePanel view="billing" />
          )}

          {activeTab === "settings" && (
            <SimplePanel
              title="Settings"
              subtitle="Tune notifications and playback defaults for your workspace."
              icon={Settings}
            >
              <div className="space-y-3">
                {[
                  "Email me when a saved pack is close to selling out.",
                  "Notify me when new regional releases match my listening habits.",
                  "Keep the persistent player open while browsing between tabs.",
                ].map((setting) => (
                  <div
                    key={setting}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-white"
                  >
                    {setting}
                  </div>
                ))}
              </div>
            </SimplePanel>
          )}

          {activeTab === "licensing" && (
            <SimplePanel
              title="Licensing Help"
              subtitle="Understand exclusivity, proof of ownership, and usage confidence."
              icon={Shield}
            >
              <div className="space-y-4 text-sm leading-relaxed text-muted">
                <p>Every completed purchase generates a unique KEVAL SOUND license code tied to your account.</p>
                <p>Exclusive tracks and full packs are removed from the live catalog immediately after purchase.</p>
                <p>Use Purchases and Downloads to retrieve each licensed MP3, WAV master, license PDF, and invoice PDF.</p>
              </div>
            </SimplePanel>
          )}

          {activeTab === "support" && (
            <SimplePanel
              title="Customer Support"
              subtitle="Get help with licensing, billing, catalog questions, or custom discovery requests."
              icon={Headphones}
            >
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    title: "Licensing guidance",
                    description: "Clarify usage rights before you publish a film, song, podcast, or brand campaign.",
                  },
                  {
                    title: "Billing support",
                    description: "Review taxes, payment receipts, refunds, or invoice requirements with the support team.",
                  },
                  {
                    title: "Catalog help",
                    description: "Need a regional mood reference or a similar pack recommendation? We can point you faster.",
                  },
                  {
                    title: "Priority response",
                    description: "Pro members receive faster turnaround on urgent licensing and delivery questions.",
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
                  >
                    <p className="text-sm font-semibold text-white">{card.title}</p>
                    <p className="mt-2 text-sm text-muted">{card.description}</p>
                  </div>
                ))}
              </div>
            </SimplePanel>
          )}

          {activeTab === "desktop" && (
            <SimplePanel
              title="Install Desktop App"
              subtitle="Set up the focused desktop experience for faster browsing and uninterrupted previews."
              icon={Monitor}
            >
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
                <p className="text-sm text-muted">
                  Request the KEVAL SOUND desktop preview build to keep your discovery workflow focused in a dedicated app environment.
                </p>
                <a
                  href="mailto:support@kevalsound.com?subject=Desktop%20App%20Access"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-vivid-blue to-mid-purple px-5 py-3 font-semibold text-white"
                >
                  <Download className="h-4 w-4" />
                  Request Installer
                </a>
              </div>
            </SimplePanel>
          )}

          {activeTab === "legal" && (
            <SimplePanel
              title="Legal"
              subtitle="Core policies and ownership references for KEVAL SOUND users."
              icon={BadgeCheck}
            >
              <div className="space-y-3">
                {[
                  "Privacy Policy",
                  "Terms of Service",
                  "Licensing Agreement",
                  "Ownership and Usage Rules",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-white"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </SimplePanel>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-5 py-10 text-center text-sm text-muted">
      {text}
    </div>
  );
}

function SimplePanel({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof User;
  children: ReactNode;
}) {
  return (
    <section className="glass rounded-2xl p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-vivid-blue/10 text-vivid-blue">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function InfoGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
        >
          <p className="text-xs uppercase tracking-wider text-muted">{item.label}</p>
          <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
