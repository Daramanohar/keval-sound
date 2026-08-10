import "server-only";

import { getPrisma } from "@/lib/db";
import { requirePurchasableTrack } from "@/server/catalog/tracks";

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      track: {
        select: {
          id: true,
          title: true,
          category: true,
          durationSeconds: true,
          saleStatus: true,
          pricePaise: true,
          currency: true,
          hasMp3: true,
          hasWav: true,
          pack: {
            select: {
              id: true,
              title: true,
              coverUrl: true,
            },
          },
        },
      },
    },
  },
};

function toCartDto(cart: Awaited<ReturnType<typeof loadCart>>) {
  const items = cart?.items ?? [];
  return {
    id: cart?.id ?? null,
    items: items.map((item) => ({
      id: item.id,
      addedAt: item.createdAt.toISOString(),
      unitAmountPaise: item.unitAmountPaiseSnapshot,
      currency: item.currencySnapshot,
      track: item.track,
    })),
    subtotalPaise: items.reduce((sum, item) => sum + item.unitAmountPaiseSnapshot, 0),
    currency: items[0]?.currencySnapshot ?? "INR",
  };
}

async function loadCart(userId: string) {
  return getPrisma().cart.findUnique({
    where: { userId },
    include: cartInclude,
  });
}

export async function getCart(userId: string) {
  return toCartDto(await loadCart(userId));
}

export async function addTrackToCart(userId: string, trackId: string) {
  const track = await requirePurchasableTrack(trackId);
  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true },
    });

    await tx.cartItem.upsert({
      where: {
        cartId_trackId: {
          cartId: cart.id,
          trackId: track.id,
        },
      },
      create: {
        cartId: cart.id,
        trackId: track.id,
        unitAmountPaiseSnapshot: track.pricePaise,
        currencySnapshot: track.currency,
      },
      update: {
        unitAmountPaiseSnapshot: track.pricePaise,
        currencySnapshot: track.currency,
      },
    });
  });

  return getCart(userId);
}

export async function removeTrackFromCart(userId: string, trackId: string) {
  const cart = await getPrisma().cart.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (cart) {
    await getPrisma().cartItem.deleteMany({
      where: { cartId: cart.id, trackId },
    });
  }

  return getCart(userId);
}

export async function clearCart(userId: string) {
  const cart = await getPrisma().cart.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (cart) {
    await getPrisma().cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  return getCart(userId);
}
