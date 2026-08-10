import "server-only";

import {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  TrackSaleStatus,
} from "@prisma/client";
import { getPrisma } from "@/lib/db";
import type { RazorpayTrackCheckout } from "@/lib/razorpay-types";
import type { AppUser } from "@/server/auth/current-user";
import {
  CHECKOUT_RESERVATION_GRACE_MINUTES,
  CHECKOUT_RESERVATION_MINUTES,
  COMMERCE_CURRENCY,
  LICENSE_TERMS_VERSION,
  TRACK_PRICE_PAISE,
} from "@/server/domain/constants";
import { createOrderNumber } from "@/server/domain/identifiers";
import { ApiError } from "@/server/http/api";
import {
  assertTaxConfigurationReady,
  calculateTax,
} from "@/server/commerce/tax";
import {
  getRazorpay,
  getRazorpayPublicKey,
  isRazorpayLivemode,
} from "@/server/payments/razorpay";
import { hashIdempotencyKey, hashRequestPayload } from "@/server/security/idempotency";

export type CheckoutSelection =
  | { mode: "direct"; trackId: string }
  | { mode: "tracks"; trackIds: string[] }
  | { mode: "cart" };

const checkoutOrderInclude = {
  items: {
    include: {
      track: {
        include: {
          pack: { select: { id: true, title: true, coverUrl: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.OrderInclude;

type CheckoutOrder = Prisma.OrderGetPayload<{ include: typeof checkoutOrderInclude }>;

function idempotencyResponse(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, Prisma.JsonValue>;
  if (
    body.provider !== "razorpay" ||
    body.flow !== "track_purchase" ||
    typeof body.appOrderId !== "string" ||
    typeof body.providerOrderId !== "string" ||
    typeof body.keyId !== "string" ||
    typeof body.amount !== "number" ||
    typeof body.currency !== "string"
  ) {
    return null;
  }
  return body as unknown as RazorpayTrackCheckout;
}

async function resolveTrackIds(userId: string, selection: CheckoutSelection) {
  if (selection.mode === "direct") return [selection.trackId];
  if (selection.mode === "tracks") return selection.trackIds;

  const cart = await getPrisma().cart.findUnique({
    where: { userId },
    select: { items: { orderBy: { createdAt: "asc" }, select: { trackId: true } } },
  });
  const trackIds = cart?.items.map((item) => item.trackId) ?? [];
  if (trackIds.length === 0) {
    throw new ApiError(409, "cart_empty", "Your cart is empty.");
  }
  return trackIds;
}

async function releaseExpiredReservations(
  tx: Prisma.TransactionClient,
  trackIds: string[],
  now: Date
) {
  const expired = await tx.inventoryReservation.findMany({
    where: { trackId: { in: trackIds }, expiresAt: { lte: now } },
    select: { id: true, orderId: true, trackId: true },
  });
  if (expired.length === 0) return;

  await tx.inventoryReservation.deleteMany({
    where: { id: { in: expired.map((reservation) => reservation.id) } },
  });
  await tx.track.updateMany({
    where: {
      id: { in: expired.map((reservation) => reservation.trackId) },
      saleStatus: TrackSaleStatus.RESERVED,
    },
    data: { saleStatus: TrackSaleStatus.AVAILABLE, version: { increment: 1 } },
  });
  await tx.order.updateMany({
    where: {
      id: { in: expired.map((reservation) => reservation.orderId) },
      status: { in: [OrderStatus.DRAFT, OrderStatus.CHECKOUT_PENDING] },
    },
    data: { status: OrderStatus.EXPIRED },
  });
}

async function createReservedOrder(
  user: AppUser,
  trackIds: string[],
  checkoutKeyHash: string,
  requestHash: string
) {
  const prisma = getPrisma();
  const checkoutExpiresAt = new Date(Date.now() + CHECKOUT_RESERVATION_MINUTES * 60_000);
  const reservationExpiresAt = new Date(
    checkoutExpiresAt.getTime() + CHECKOUT_RESERVATION_GRACE_MINUTES * 60_000
  );
  const livemode = isRazorpayLivemode();
  const taxConfig = assertTaxConfigurationReady("TRACK_LICENSE");
  const itemQuote = calculateTax(TRACK_PRICE_PAISE, "TRACK_LICENSE");

  return prisma.$transaction(
    async (tx) => {
      await releaseExpiredReservations(tx, trackIds, new Date());

      const billingProfile = await tx.billingProfile.findUnique({
        where: { userId: user.id },
      });
      if (!billingProfile) {
        throw new ApiError(
          409,
          "billing_profile_required",
          "Add your billing address in Plans & Billing before starting checkout."
        );
      }

      const tracks = await tx.track.findMany({
        where: { id: { in: trackIds } },
        include: { pack: { select: { id: true, title: true, coverUrl: true } } },
      });
      const tracksById = new Map(tracks.map((track) => [track.id, track]));
      const orderedTracks = trackIds.map((trackId) => tracksById.get(trackId));

      if (orderedTracks.some((track) => !track)) {
        throw new ApiError(404, "track_not_found", "One or more selected tracks no longer exist.");
      }

      for (const track of orderedTracks) {
        if (!track) continue;
        if (track.saleStatus !== TrackSaleStatus.AVAILABLE) {
          throw new ApiError(
            409,
            "track_not_available",
            `${track.title} is reserved or has already been sold.`
          );
        }
        if (!track.hasMp3 || !track.hasWav) {
          throw new ApiError(409, "track_assets_incomplete", `${track.title} is not ready for purchase.`);
        }
        if (track.pricePaise !== TRACK_PRICE_PAISE || track.currency !== COMMERCE_CURRENCY) {
          throw new ApiError(409, "catalog_price_invalid", "The catalog price requires administrator review.");
        }
      }

      const subtotalPaise = orderedTracks.length * itemQuote.taxablePaise;
      const taxPaise = orderedTracks.length * itemQuote.taxPaise;
      const totalPaise = orderedTracks.length * itemQuote.totalPaise;
      const billingAddressSnapshot = {
        legalName: billingProfile.legalName,
        addressLine1: billingProfile.addressLine1,
        addressLine2: billingProfile.addressLine2,
        city: billingProfile.city,
        stateName: billingProfile.stateName,
        stateCode: billingProfile.stateCode,
        postalCode: billingProfile.postalCode,
        countryCode: billingProfile.countryCode,
      } satisfies Prisma.InputJsonObject;
      const order = await tx.order.create({
        data: {
          orderNumber: createOrderNumber(),
          userId: user.id,
          status: OrderStatus.DRAFT,
          currency: COMMERCE_CURRENCY,
          subtotalPaise,
          taxPaise,
          totalPaise,
          customerEmailSnapshot: user.email,
          customerNameSnapshot: billingProfile.legalName,
          kevalUserIdSnapshot: user.kevalUserId,
          billingAddressSnapshot,
          customerGstinSnapshot: billingProfile.gstin,
          placeOfSupplyCode:
            billingProfile.countryCode === "IN" ? billingProfile.stateCode : "96",
          taxRateBps: taxConfig.rateBps,
          taxMode: taxConfig.pricingMode,
          sacCode: taxConfig.sacCode,
          taxConfigVersion: taxConfig.version,
          paymentProvider: PaymentProvider.RAZORPAY,
          providerLivemode: livemode,
          checkoutIdempotencyKey: checkoutKeyHash,
          expiresAt: checkoutExpiresAt,
          items: {
            create: orderedTracks.flatMap((track) =>
              track
                ? [
                    {
                      trackId: track.id,
                      titleSnapshot: track.title,
                      packTitleSnapshot: track.pack.title,
                      categorySnapshot: track.category,
                      unitAmountPaise: itemQuote.taxablePaise,
                      taxPaise: itemQuote.taxPaise,
                      totalPaise: itemQuote.totalPaise,
                      currency: COMMERCE_CURRENCY,
                      licenseTermsVersion: LICENSE_TERMS_VERSION,
                    },
                  ]
                : []
            ),
          },
          payments: {
            create: {
              provider: PaymentProvider.RAZORPAY,
              providerLivemode: livemode,
              status: PaymentStatus.PENDING,
              amountPaise: totalPaise,
              currency: COMMERCE_CURRENCY,
            },
          },
        },
        include: checkoutOrderInclude,
      });

      for (const track of orderedTracks) {
        if (!track) continue;
        const updated = await tx.track.updateMany({
          where: { id: track.id, saleStatus: TrackSaleStatus.AVAILABLE },
          data: { saleStatus: TrackSaleStatus.RESERVED, version: { increment: 1 } },
        });
        if (updated.count !== 1) {
          throw new ApiError(409, "track_not_available", `${track.title} was reserved by another buyer.`);
        }
        await tx.inventoryReservation.create({
          data: {
            trackId: track.id,
            orderId: order.id,
            userId: user.id,
            expiresAt: reservationExpiresAt,
          },
        });
      }

      await tx.idempotencyRecord.create({
        data: {
          userId: user.id,
          scope: "track_checkout",
          key: checkoutKeyHash,
          requestHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
        },
      });

      return order;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

async function loadExistingCheckout(userId: string, keyHash: string, requestHash: string) {
  const prisma = getPrisma();
  const record = await prisma.idempotencyRecord.findUnique({
    where: { userId_scope_key: { userId, scope: "track_checkout", key: keyHash } },
  });
  if (!record) return null;
  if (record.requestHash !== requestHash) {
    throw new ApiError(409, "idempotency_key_reused", "This idempotency key was used for a different checkout.");
  }

  const response = idempotencyResponse(record.responseBody);
  if (response) return { response } as const;

  const order = await prisma.order.findUnique({
    where: { checkoutIdempotencyKey: keyHash },
    include: checkoutOrderInclude,
  });
  return order ? ({ order } as const) : null;
}

async function prepareOrder(
  user: AppUser,
  selection: CheckoutSelection,
  rawIdempotencyKey: string
) {
  const trackIds = [...new Set(await resolveTrackIds(user.id, selection))];
  if (trackIds.length === 0) {
    throw new ApiError(400, "tracks_required", "Select at least one song to continue.");
  }
  if (trackIds.length > 20) {
    throw new ApiError(400, "cart_too_large", "A checkout can contain at most 20 tracks.");
  }

  const canonicalRequest = { trackIds: [...trackIds].sort() };
  const requestHash = hashRequestPayload(canonicalRequest);
  const keyHash = hashIdempotencyKey(user.id, "track_checkout", rawIdempotencyKey);
  const existing = await loadExistingCheckout(user.id, keyHash, requestHash);
  if (existing) return existing;

  try {
    return { order: await createReservedOrder(user, trackIds, keyHash, requestHash) } as const;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await loadExistingCheckout(user.id, keyHash, requestHash);
      if (raced) return raced;
    }
    throw error;
  }
}

function checkoutDescription(order: CheckoutOrder) {
  if (order.items.length === 1) {
    return `Exclusive license for ${order.items[0]?.titleSnapshot ?? "track"}`;
  }
  return `${order.items.length} exclusive Keval Sound track licenses`;
}

function checkoutResponse(user: AppUser, order: CheckoutOrder, providerOrderId: string) {
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const response: RazorpayTrackCheckout = {
    provider: "razorpay",
    flow: "track_purchase",
    appOrderId: order.id,
    providerOrderId,
    keyId: getRazorpayPublicKey(),
    amount: order.totalPaise,
    currency: order.currency,
    name: "KEVAL SOUND",
    description: checkoutDescription(order),
    ...(appUrl ? { image: `${appUrl}/logo/keval-logo.png` } : {}),
    prefill: {
      ...(name ? { name } : {}),
      ...(user.email ? { email: user.email } : {}),
    },
    notes: {
      keval_order_number: order.orderNumber,
      keval_user_id: user.kevalUserId,
      tax_mode: order.taxMode,
      gst_rate_bps: String(order.taxRateBps),
      sac_code: order.sacCode ?? "",
    },
    theme: { color: "#e5422e", backdropColor: "#0c0d1c" },
    timeoutSeconds: CHECKOUT_RESERVATION_MINUTES * 60,
  };
  return response;
}

async function findOrCreateRazorpayOrder(order: CheckoutOrder) {
  const razorpay = getRazorpay();
  const existing = await razorpay.orders.all({ receipt: order.orderNumber, count: 10 });
  const matching = existing.items.find(
    (candidate) =>
      candidate.receipt === order.orderNumber &&
      Number(candidate.amount) === order.totalPaise &&
      candidate.currency.toUpperCase() === order.currency
  );
  if (matching) return matching;

  return razorpay.orders.create({
    amount: order.totalPaise,
    currency: order.currency,
    receipt: order.orderNumber,
    partial_payment: false,
    notes: {
      keval_flow: "track_purchase",
      keval_order_id: order.id,
      keval_order_number: order.orderNumber,
      app_user_id: order.userId,
      keval_user_id: order.kevalUserIdSnapshot,
      gst_rate_bps: String(order.taxRateBps),
      sac_code: order.sacCode ?? "",
    },
    payment: {
      capture: "automatic",
      capture_options: {
        automatic_expiry_period: CHECKOUT_RESERVATION_MINUTES,
        manual_expiry_period:
          CHECKOUT_RESERVATION_MINUTES + CHECKOUT_RESERVATION_GRACE_MINUTES,
        refund_speed: "normal",
      },
    },
  });
}

async function createRazorpayOrder(user: AppUser, order: CheckoutOrder) {
  const livemode = isRazorpayLivemode();
  const providerOrder = await findOrCreateRazorpayOrder(order);
  const response = checkoutResponse(user, order, providerOrder.id);

  await getPrisma().$transaction([
    getPrisma().order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CHECKOUT_PENDING,
        paymentProvider: PaymentProvider.RAZORPAY,
        providerLivemode: livemode,
        providerOrderId: providerOrder.id,
      },
    }),
    getPrisma().idempotencyRecord.update({
      where: {
        userId_scope_key: {
          userId: user.id,
          scope: "track_checkout",
          key: order.checkoutIdempotencyKey ?? "",
        },
      },
      data: { responseStatus: 201, responseBody: response },
    }),
  ]);

  return response;
}

export async function createTrackCheckout(
  user: AppUser,
  selection: CheckoutSelection,
  rawIdempotencyKey: string
) {
  const prepared = await prepareOrder(user, selection, rawIdempotencyKey);
  if ("response" in prepared) return prepared.response;

  if (prepared.order.providerOrderId) {
    const providerOrder = await getRazorpay().orders.fetch(prepared.order.providerOrderId);
    if (providerOrder.status === "created" || providerOrder.status === "attempted") {
      return checkoutResponse(user, prepared.order, providerOrder.id);
    }
    throw new ApiError(409, "checkout_already_paid", "This payment is already being processed.");
  }

  return createRazorpayOrder(user, prepared.order);
}
