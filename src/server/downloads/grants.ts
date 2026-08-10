import "server-only";

import crypto from "node:crypto";
import {
  AuditActorType,
  DocumentStatus,
  DownloadAssetType,
  EntitlementKind,
  EntitlementStatus,
  OrderDocumentType,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
} from "@prisma/client";
import { getPrisma } from "@/lib/db";
import type { AppUser } from "@/server/auth/current-user";
import { getClientIpHash, writeAuditLog } from "@/server/audit/log";
import { DOWNLOAD_GRANT_TTL_SECONDS } from "@/server/domain/constants";
import { currentPaymentLivemode } from "@/server/config/env";
import {
  generateLicenseCertificate,
  licenseFilename,
} from "@/server/documents/license-pdf";
import { generateInvoice, invoiceFilename } from "@/server/documents/invoice-pdf";
import { allocateInvoiceNumber } from "@/server/documents/invoice-number";
import { ApiError } from "@/server/http/api";
import { createSignedMediaUrl } from "@/server/media/token";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function entitlementKindFor(assetType: DownloadAssetType) {
  if (assetType === DownloadAssetType.MP3) return EntitlementKind.MP3_DOWNLOAD;
  if (assetType === DownloadAssetType.WAV) return EntitlementKind.WAV_DOWNLOAD;
  if (assetType === DownloadAssetType.LICENSE_PDF) return EntitlementKind.TRACK_LICENSE;
  if (assetType === DownloadAssetType.INVOICE_PDF) return EntitlementKind.TRACK_LICENSE;
  return null;
}

export async function createTrackDownloadGrant(input: {
  user: AppUser;
  request: Request;
  requestId: string;
  trackId: string;
  assetType: DownloadAssetType;
}) {
  const entitlementKind = entitlementKindFor(input.assetType);
  if (!entitlementKind) {
    throw new ApiError(
      409,
      "document_not_ready",
      "This document is not ready for secure download yet."
    );
  }

  const now = new Date();
  const entitlement = await getPrisma().entitlement.findFirst({
    where: {
      userId: input.user.id,
      trackId: input.trackId,
      kind: entitlementKind,
      status: EntitlementStatus.ACTIVE,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      orderItem: {
        order: {
          userId: input.user.id,
          status: OrderStatus.FULFILLED,
          paymentProvider: PaymentProvider.RAZORPAY,
          providerLivemode: currentPaymentLivemode(),
        },
      },
    },
    include: {
      track: { select: { hasMp3: true, hasWav: true } },
      orderItem: {
        select: {
          license: { select: { id: true } },
        },
      },
    },
  });
  if (!entitlement) {
    throw new ApiError(
      403,
      "download_not_entitled",
      "This account does not have download access to the requested asset."
    );
  }
  if (
    (input.assetType === DownloadAssetType.MP3 && !entitlement.track?.hasMp3) ||
    (input.assetType === DownloadAssetType.WAV && !entitlement.track?.hasWav)
  ) {
    throw new ApiError(404, "download_asset_missing", "The requested audio file is unavailable.");
  }
  if (input.assetType === DownloadAssetType.LICENSE_PDF && !entitlement.orderItem?.license) {
    throw new ApiError(409, "license_not_ready", "The license record is not ready yet. Try again shortly.");
  }

  const rawToken = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + DOWNLOAD_GRANT_TTL_SECONDS * 1000);
  const grant = await getPrisma().downloadGrant.create({
    data: {
      userId: input.user.id,
      trackId: input.trackId,
      entitlementId: entitlement.id,
      assetType: input.assetType,
      tokenHash: hashToken(rawToken),
      expiresAt,
      maxUses: 1,
    },
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    actorUserId: input.user.id,
    action: "download.grant_created",
    targetType: "download_grant",
    targetId: grant.id,
    requestId: input.requestId,
    ipHash: getClientIpHash(input.request),
    metadata: { trackId: input.trackId, assetType: input.assetType },
  });

  return {
    downloadUrl: `/api/downloads/${encodeURIComponent(rawToken)}`,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function redeemTrackDownloadGrant(input: {
  user: AppUser;
  request: Request;
  requestId: string;
  rawToken: string;
}) {
  const prisma = getPrisma();
  const tokenHash = hashToken(input.rawToken);
  const now = new Date();

  const redeemed = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${tokenHash}))`;
    const grant = await tx.downloadGrant.findUnique({
      where: { tokenHash },
      include: {
        entitlement: { select: { status: true, endsAt: true } },
        track: {
          select: {
            id: true,
            title: true,
            pack: { select: { title: true, category: true } },
          },
        },
      },
    });
    if (!grant || grant.userId !== input.user.id) {
      throw new ApiError(404, "download_grant_not_found", "This download link is invalid.");
    }
    if (
      grant.revokedAt ||
      grant.expiresAt <= now ||
      grant.useCount >= grant.maxUses ||
      grant.entitlement?.status !== EntitlementStatus.ACTIVE ||
      (grant.entitlement.endsAt && grant.entitlement.endsAt <= now)
    ) {
      throw new ApiError(410, "download_grant_expired", "This download link has expired. Request a new one.");
    }

    let document:
      | { bytes: Uint8Array; filename: string }
      | undefined;
    if (grant.assetType === DownloadAssetType.LICENSE_PDF) {
      const orderItem = await tx.orderItem.findFirst({
        where: {
          trackId: grant.trackId,
          entitlements: { some: { id: grant.entitlementId ?? undefined, userId: input.user.id } },
        },
        select: {
          packTitleSnapshot: true,
          categorySnapshot: true,
          totalPaise: true,
          currency: true,
          order: { select: { orderNumber: true } },
          license: true,
        },
      });
      if (!orderItem?.license) {
        throw new ApiError(409, "license_not_ready", "The license record is not ready yet. Try again shortly.");
      }

      const issuedAt = orderItem.license.issuedAt ?? now;
      const generated = await generateLicenseCertificate({
        licenseNumber: orderItem.license.licenseNumber,
        orderNumber: orderItem.order.orderNumber,
        termsVersion: orderItem.license.termsVersion,
        issuedAt,
        licenseeName: orderItem.license.licenseeNameSnapshot,
        licenseeEmail: orderItem.license.licenseeEmailSnapshot,
        kevalUserId: orderItem.license.kevalUserIdSnapshot,
        trackTitle: orderItem.license.trackTitleSnapshot,
        packTitle: orderItem.packTitleSnapshot,
        category: orderItem.categorySnapshot,
        purchaseAmountPaise: orderItem.totalPaise,
        currency: orderItem.currency,
      });
      await tx.license.update({
        where: { id: orderItem.license.id },
        data: {
          documentStatus: DocumentStatus.READY,
          issuedAt,
          fileSha256: generated.sha256,
        },
      });
      document = {
        bytes: generated.bytes,
        filename: licenseFilename(
          orderItem.license.trackTitleSnapshot,
          orderItem.license.licenseNumber
        ),
      };
    } else if (grant.assetType === DownloadAssetType.INVOICE_PDF) {
      const invoiceItem = await tx.orderItem.findFirst({
        where: {
          trackId: grant.trackId,
          entitlements: {
            some: { id: grant.entitlementId ?? undefined, userId: input.user.id },
          },
        },
        select: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              paymentProvider: true,
              providerLivemode: true,
              customerNameSnapshot: true,
              customerEmailSnapshot: true,
              billingAddressSnapshot: true,
              customerGstinSnapshot: true,
              placeOfSupplyCode: true,
              kevalUserIdSnapshot: true,
              currency: true,
              subtotalPaise: true,
              taxPaise: true,
              totalPaise: true,
              taxRateBps: true,
              taxMode: true,
              sacCode: true,
              paidAt: true,
              documents: {
                where: { type: OrderDocumentType.INVOICE },
                take: 1,
                select: { invoiceNumber: true },
              },
              payments: {
                where: { status: PaymentStatus.SUCCEEDED },
                orderBy: { succeededAt: "desc" },
                take: 1,
                select: { providerPaymentId: true },
              },
              items: {
                orderBy: { createdAt: "asc" },
                select: {
                  titleSnapshot: true,
                  unitAmountPaise: true,
                  taxPaise: true,
                  totalPaise: true,
                  license: { select: { licenseNumber: true } },
                },
              },
            },
          },
        },
      });
      const order = invoiceItem?.order;
      const providerPaymentId = order?.payments[0]?.providerPaymentId;
      if (!order || !providerPaymentId) {
        throw new ApiError(409, "invoice_not_ready", "The paid invoice is not ready yet. Try again shortly.");
      }
      const issuedAt = order.paidAt ?? now;
      const invoiceNumber =
        order.documents[0]?.invoiceNumber ??
        (await allocateInvoiceNumber(tx, issuedAt, order.providerLivemode));
      const rawAddress = order.billingAddressSnapshot;
      const billingAddress =
        rawAddress && typeof rawAddress === "object" && !Array.isArray(rawAddress)
          ? (rawAddress as {
              addressLine1: string;
              addressLine2?: string | null;
              city: string;
              stateName: string;
              stateCode?: string | null;
              postalCode: string;
              countryCode: string;
            })
          : null;
      const generated = await generateInvoice({
        invoiceNumber,
        orderNumber: order.orderNumber,
        issuedAt,
        paymentProvider: order.paymentProvider,
        providerPaymentId,
        customerName: order.customerNameSnapshot ?? input.user.kevalUserId,
        customerEmail: order.customerEmailSnapshot,
        billingAddress,
        customerGstin: order.customerGstinSnapshot,
        placeOfSupplyCode: order.placeOfSupplyCode,
        kevalUserId: order.kevalUserIdSnapshot,
        currency: order.currency,
        subtotalPaise: order.subtotalPaise,
        taxPaise: order.taxPaise,
        totalPaise: order.totalPaise,
        taxRateBps: order.taxRateBps,
        taxMode: order.taxMode,
        sacCode: order.sacCode,
        providerLivemode: order.providerLivemode,
        items: order.items.map((item) => ({
          title: item.titleSnapshot,
          licenseNumber: item.license?.licenseNumber ?? "Preparing",
          unitAmountPaise: item.unitAmountPaise,
          taxPaise: item.taxPaise,
          totalPaise: item.totalPaise,
        })),
      });
      await tx.orderDocument.upsert({
        where: {
          orderId_type: { orderId: order.id, type: OrderDocumentType.INVOICE },
        },
        create: {
          orderId: order.id,
          type: OrderDocumentType.INVOICE,
          invoiceNumber,
          status: DocumentStatus.READY,
          provider: PaymentProvider.RAZORPAY,
          providerLivemode: currentPaymentLivemode(),
          fileSha256: generated.sha256,
          generatedAt: issuedAt,
        },
        update: {
          invoiceNumber,
          status: DocumentStatus.READY,
          fileSha256: generated.sha256,
          generatedAt: issuedAt,
          errorMessage: null,
        },
      });
      document = {
        bytes: generated.bytes,
        filename: invoiceFilename(order.orderNumber),
      };
    }

    await tx.downloadGrant.update({
      where: { id: grant.id },
      data: { useCount: { increment: 1 } },
    });
    await tx.downloadEvent.create({
      data: {
        grantId: grant.id,
        userId: input.user.id,
        trackId: grant.trackId,
        assetType: grant.assetType,
        ipHash: getClientIpHash(input.request),
        userAgent: input.request.headers.get("user-agent")?.slice(0, 2000) ?? null,
      },
    });
    return { grant, document };
  });

  if (redeemed.document) {
    await writeAuditLog({
      actorType: AuditActorType.USER,
      actorUserId: input.user.id,
      action: "download.grant_redeemed",
      targetType: "download_grant",
      targetId: redeemed.grant.id,
      requestId: input.requestId,
      ipHash: getClientIpHash(input.request),
      metadata: {
        trackId: redeemed.grant.trackId,
        assetType: redeemed.grant.assetType,
      },
    });
    return { kind: "document" as const, ...redeemed.document };
  }

  if (
    redeemed.grant.assetType !== DownloadAssetType.MP3 &&
    redeemed.grant.assetType !== DownloadAssetType.WAV
  ) {
    throw new ApiError(409, "download_asset_not_supported", "This download type is not available yet.");
  }
  const access =
    redeemed.grant.assetType === DownloadAssetType.MP3 ? "mp3-download" : "wav-download";
  const signed = createSignedMediaUrl({
    subject: input.user.id,
    trackId: redeemed.grant.trackId,
    access,
    sessionId: redeemed.grant.id,
    ttlSeconds: DOWNLOAD_GRANT_TTL_SECONDS,
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    actorUserId: input.user.id,
    action: "download.grant_redeemed",
    targetType: "download_grant",
    targetId: redeemed.grant.id,
    requestId: input.requestId,
    ipHash: getClientIpHash(input.request),
    metadata: {
      trackId: redeemed.grant.trackId,
      assetType: redeemed.grant.assetType,
    },
  });

  return { kind: "media" as const, url: signed.url };
}
