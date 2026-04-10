"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import {
  packs,
  samples,
  tracks,
  type CartItem,
  type Pack,
  type Sample,
  type Track,
} from "./mock-data";

type CatalogType = CartItem["type"];

export interface PurchaseOrder {
  id: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  promoCode?: string;
  licenses: Record<string, string>;
}

interface StoreState {
  cart: CartItem[];
  wishlist: CartItem[];
  orders: PurchaseOrder[];
}

interface CheckoutOptions {
  discountRate?: number;
  promoCode?: string;
}

interface StoreContextType extends StoreState {
  isReady: boolean;
  cartCount: number;
  wishlistCount: number;
  addTrackToCart: (track: Track) => boolean;
  addPackToCart: (pack: Pack) => boolean;
  addSampleToCart: (sample: Sample) => boolean;
  removeFromCart: (id: string, type?: CatalogType) => void;
  clearCart: () => void;
  toggleTrackWishlist: (track: Track) => void;
  togglePackWishlist: (pack: Pack) => void;
  toggleSampleWishlist: (sample: Sample) => void;
  isInCart: (id: string, type?: CatalogType) => boolean;
  isInWishlist: (id: string, type?: CatalogType) => boolean;
  isOwned: (id: string, type?: CatalogType) => boolean;
  getLicense: (id: string, type?: CatalogType) => string | null;
  checkout: (options?: CheckoutOptions) => PurchaseOrder | null;
  latestOrder: PurchaseOrder | null;
}

const emptyState: StoreState = {
  cart: [],
  wishlist: [],
  orders: [],
};

const emptyContext: StoreContextType = {
  ...emptyState,
  isReady: false,
  cartCount: 0,
  wishlistCount: 0,
  addTrackToCart: () => false,
  addPackToCart: () => false,
  addSampleToCart: () => false,
  removeFromCart: () => {},
  clearCart: () => {},
  toggleTrackWishlist: () => {},
  togglePackWishlist: () => {},
  toggleSampleWishlist: () => {},
  isInCart: () => false,
  isInWishlist: () => false,
  isOwned: () => false,
  getLicense: () => null,
  checkout: () => null,
  latestOrder: null,
};

const StoreContext = createContext<StoreContextType | null>(null);

function itemKey(id: string, type: CatalogType = "track") {
  return `${type}:${id}`;
}

function itemKeyFromCartItem(item: CartItem) {
  return itemKey(item.id, item.type);
}

function createTrackItem(track: Track): CartItem {
  return {
    id: track.id,
    type: "track",
    title: track.title,
    artist: track.artist,
    price: track.price,
    coverUrl: track.coverUrl,
    license: "exclusive",
  };
}

function createPackItem(pack: Pack): CartItem {
  return {
    id: pack.id,
    type: "pack",
    title: pack.title,
    artist: `${pack.trackCount} tracks`,
    price: pack.price,
    coverUrl: pack.coverUrl,
    license: "exclusive",
  };
}

function createSampleItem(sample: Sample): CartItem {
  return {
    id: sample.id,
    type: "sample",
    title: sample.name,
    artist: sample.instrument,
    price: sample.price,
    coverUrl: "from-grey-azure to-vivid-blue",
    license: "premium",
  };
}

function readStore(storageKey: string): StoreState {
  if (typeof window === "undefined") return emptyState;

  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? ({ ...emptyState, ...JSON.parse(raw) } as StoreState) : emptyState;
  } catch {
    return emptyState;
  }
}

function writeStore(storageKey: string, state: StoreState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

function createLicenseCode(item: CartItem, orderId: string) {
  return `KVL-${item.type.slice(0, 1).toUpperCase()}${item.id.toUpperCase()}-${orderId.slice(-5).toUpperCase()}`;
}

function StoreSessionProvider({
  children,
  storageKey,
}: {
  children: ReactNode;
  storageKey: string;
}) {
  const [state, setState] = useState<StoreState>(() => readStore(storageKey));

  useEffect(() => {
    writeStore(storageKey, state);
  }, [state, storageKey]);

  const ownedItems = useMemo(() => {
    const owned = new Set<string>();

    state.orders.forEach((order) => {
      order.items.forEach((item) => {
        owned.add(itemKeyFromCartItem(item));
      });
    });

    return owned;
  }, [state.orders]);

  const addItemToCollection = useCallback((item: CartItem) => {
    let added = false;

    setState((current) => {
      if (
        current.cart.some((entry) => itemKeyFromCartItem(entry) === itemKeyFromCartItem(item))
      ) {
        return current;
      }

      added = true;
      return {
        ...current,
        cart: [...current.cart, item],
      };
    });

    return added;
  }, []);

  const toggleWishlistItem = useCallback((item: CartItem) => {
    setState((current) => {
      const exists = current.wishlist.some(
        (entry) => itemKeyFromCartItem(entry) === itemKeyFromCartItem(item)
      );

      return {
        ...current,
        wishlist: exists
          ? current.wishlist.filter(
              (entry) => itemKeyFromCartItem(entry) !== itemKeyFromCartItem(item)
            )
          : [...current.wishlist, item],
      };
    });
  }, []);

  const addTrackToCart = useCallback(
    (track: Track) => {
      if (ownedItems.has(itemKey(track.id, "track"))) return false;
      return addItemToCollection(createTrackItem(track));
    },
    [addItemToCollection, ownedItems]
  );

  const addPackToCart = useCallback(
    (pack: Pack) => {
      if (ownedItems.has(itemKey(pack.id, "pack"))) return false;
      return addItemToCollection(createPackItem(pack));
    },
    [addItemToCollection, ownedItems]
  );

  const addSampleToCart = useCallback(
    (sample: Sample) => {
      if (ownedItems.has(itemKey(sample.id, "sample"))) return false;
      return addItemToCollection(createSampleItem(sample));
    },
    [addItemToCollection, ownedItems]
  );

  const removeFromCart = useCallback((id: string, type?: CatalogType) => {
    setState((current) => ({
      ...current,
      cart: current.cart.filter((item) =>
        type ? itemKey(item.id, item.type) !== itemKey(id, type) : item.id !== id
      ),
    }));
  }, []);

  const clearCart = useCallback(() => {
    setState((current) => ({ ...current, cart: [] }));
  }, []);

  const isInCart = useCallback(
    (id: string, type: CatalogType = "track") =>
      state.cart.some((item) => itemKey(item.id, item.type) === itemKey(id, type)),
    [state.cart]
  );

  const isInWishlist = useCallback(
    (id: string, type: CatalogType = "track") =>
      state.wishlist.some((item) => itemKey(item.id, item.type) === itemKey(id, type)),
    [state.wishlist]
  );

  const isOwned = useCallback(
    (id: string, type: CatalogType = "track") => ownedItems.has(itemKey(id, type)),
    [ownedItems]
  );

  const getLicense = useCallback(
    (id: string, type: CatalogType = "track") => {
      const lookupKey = itemKey(id, type);

      for (const order of [...state.orders].reverse()) {
        const matchedItem = order.items.find(
          (item) => itemKeyFromCartItem(item) === lookupKey
        );

        if (matchedItem) {
          return order.licenses[lookupKey] ?? null;
        }
      }

      return null;
    },
    [state.orders]
  );

  const checkout = useCallback((options?: CheckoutOptions) => {
    let completedOrder: PurchaseOrder | null = null;

    setState((current) => {
      if (!current.cart.length) return current;

      const subtotal = current.cart.reduce((sum, item) => sum + item.price, 0);
      const discount = Math.round(subtotal * (options?.discountRate ?? 0));
      const tax = Math.round((subtotal - discount) * 0.18);
      const total = subtotal - discount + tax;
      const orderId = `order-${Date.now()}`;
      const licenses = current.cart.reduce<Record<string, string>>((acc, item) => {
        acc[itemKeyFromCartItem(item)] = createLicenseCode(item, orderId);
        return acc;
      }, {});

      const nextOrder: PurchaseOrder = {
        id: orderId,
        createdAt: new Date().toISOString(),
        items: current.cart,
        subtotal,
        discount,
        tax,
        total,
        promoCode: options?.promoCode,
        licenses,
      };

      completedOrder = nextOrder;

      return {
        ...current,
        cart: [],
        orders: [nextOrder, ...current.orders],
      };
    });

    return completedOrder;
  }, []);

  const value = useMemo<StoreContextType>(
    () => ({
      ...state,
      isReady: true,
      cartCount: state.cart.length,
      wishlistCount: state.wishlist.length,
      addTrackToCart,
      addPackToCart,
      addSampleToCart,
      removeFromCart,
      clearCart,
      toggleTrackWishlist: (track) => toggleWishlistItem(createTrackItem(track)),
      togglePackWishlist: (pack) => toggleWishlistItem(createPackItem(pack)),
      toggleSampleWishlist: (sample) => toggleWishlistItem(createSampleItem(sample)),
      isInCart,
      isInWishlist,
      isOwned,
      getLicense,
      checkout,
      latestOrder: state.orders[0] ?? null,
    }),
    [
      addPackToCart,
      addSampleToCart,
      addTrackToCart,
      checkout,
      clearCart,
      getLicense,
      isInCart,
      isInWishlist,
      isOwned,
      removeFromCart,
      state,
      toggleWishlistItem,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return <StoreContext.Provider value={emptyContext}>{children}</StoreContext.Provider>;
  }

  if (!user?.email) {
    return (
      <StoreContext.Provider value={{ ...emptyContext, isReady: true }}>
        {children}
      </StoreContext.Provider>
    );
  }

  const storageKey = `keval-store:${user.email.toLowerCase()}`;
  return (
    <StoreSessionProvider key={storageKey} storageKey={storageKey}>
      {children}
    </StoreSessionProvider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }

  return context;
}

export function findTrackById(trackId: string) {
  return tracks.find((track) => track.id === trackId) ?? null;
}

export function findPackById(packId: string) {
  return packs.find((pack) => pack.id === packId) ?? null;
}

export function findSampleById(sampleId: string) {
  return samples.find((sample) => sample.id === sampleId) ?? null;
}
