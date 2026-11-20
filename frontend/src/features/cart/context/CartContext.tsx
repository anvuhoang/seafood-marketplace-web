"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/features/auth/api/auth.api";
import { useAuth } from "@/features/auth/context/AuthContext";
import { CartToast, type CartToastMessage } from "../components/CartToast";
import { addCartItem, clearServerCart, getCart, mergeCart, quoteCart, removeCartItem, updateCartItem } from "../api/cart.api";
import {
  EMPTY_CART,
  type CartActionResult,
  type CartItemView,
  type CartLine,
  type CartVendorGroup,
  type CartView,
  type MergeResult,
  type QuoteView,
} from "../types/cart.types";
import { cleanLines, clearGuestLines, readGuestLines, roundQuantity, writeGuestLines } from "../utils/guest-cart";

interface CartContextType {
  items: CartItemView[];
  /** The lines grouped by vendor, each with the total the server worked out for it. */
  vendors: CartVendorGroup[];
  /** Number of lines (different offers), as shown on the header badge. */
  itemCount: number;
  /** Total in VND of the lines that can be bought, worked out by the server. */
  totalPrice: number;
  /** A line cannot be bought as it is (out of stock, withdrawn...); the cart page says which. */
  hasProblems: boolean;
  isSignedIn: boolean;
  /** True until the cart has been read (from the server, or priced for a guest). */
  isLoading: boolean;
  /** The cart could not be read; the page offers a retry instead of showing an empty cart. */
  loadError: string | null;
  /** A change is being sent; the page disables the controls meanwhile. */
  isBusy: boolean;
  /** Adds to the quantity already in the cart. Never reports success for an offer that cannot be bought. */
  addToCart: (line: CartLine) => Promise<CartActionResult>;
  /** Sets (does not add) the quantity of a line. */
  updateQuantity: (item: CartItemView, quantity: number) => Promise<CartActionResult>;
  removeItem: (item: CartItemView) => Promise<CartActionResult>;
  /** Removes several lines in one go (the ticked ones). */
  removeItems: (items: CartItemView[]) => Promise<CartActionResult>;
  clearCart: () => Promise<CartActionResult>;
  refresh: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const GUEST = "guest";
const CONNECTION_ERROR = "Không thể kết nối tới máy chủ. Vui lòng thử lại.";

const errorMessage = (error: unknown) => (error instanceof ApiError ? error.message : CONNECTION_ERROR);

/**
 * The customer's cart.
 *
 * Signed in: it lives on the server; every change is an API call with the token, and what comes
 * back (prices, stock, totals) is what the screen shows. Guest: only offer ids and quantities are
 * kept in the browser, and the server prices them each time (`POST /cart/quote`), so nothing the
 * browser stores is trusted. After signing in, the browser cart is merged into the account's cart.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, isAuthenticated, isLoading: authLoading } = useAuth();
  const token = isAuthenticated ? accessToken : null;
  // The cart on screen belongs to this key; a cart read for another key is never shown.
  const key = token ?? GUEST;

  const [loaded, setLoaded] = useState<{ key: string; cart: CartView } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [toast, setToast] = useState<CartToastMessage | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const [reloads, setReloads] = useState(0);

  const keyRef = useRef(key);
  useEffect(() => {
    keyRef.current = key;
  }, [key]);
  // One merge per sign-in, even when React runs the effect twice in development.
  const merging = useRef<{ token: string; promise: Promise<MergeResult> } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const show = (cart: CartView) => {
      if (cancelled) return;
      setLoaded({ key, cart });
      setLoadError(null);
    };

    async function load() {
      try {
        if (token) {
          const lines = readGuestLines();
          if (lines.length > 0) {
            if (merging.current?.token !== token) merging.current = { token, promise: mergeCart(token, lines) };
            try {
              const result = await merging.current.promise;
              clearGuestLines();
              if (result.notices.length > 0) setToast({ message: result.notices.join(" "), kind: "info" });
              show(result.cart);
              return;
            } catch {
              // The guest lines stay in the browser and are merged next time; show the account's cart now.
              merging.current = null;
            }
          }
          show(await getCart(token));
          return;
        }

        merging.current = null;
        const lines = readGuestLines();
        if (lines.length === 0) return show(EMPTY_CART);
        show(withoutUnknown(await quoteCart(lines), lines));
      } catch (error) {
        if (cancelled) return;
        setLoaded({ key, cart: EMPTY_CART });
        setLoadError(errorMessage(error));
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token, key, authLoading, reloads]);

  const cart = loaded?.key === key ? loaded.cart : EMPTY_CART;
  const isLoading = authLoading || loaded?.key !== key;

  /** Runs a change and turns its outcome into a message for the toast and the caller. */
  const run = useCallback(async (change: () => Promise<CartActionResult>): Promise<CartActionResult> => {
    setIsBusy(true);
    try {
      const result = await change();
      setToast({ message: result.message, kind: "success" });
      return result;
    } catch (error) {
      const result = { success: false, message: errorMessage(error) };
      setToast({ message: result.message, kind: "error" });
      return result;
    } finally {
      setIsBusy(false);
    }
  }, []);

  /** Shows the new cart, unless the user signed in or out while the request was running. */
  const commit = useCallback((forKey: string, next: CartView) => {
    if (keyRef.current === forKey) setLoaded({ key: forKey, cart: next });
  }, []);

  /**
   * Guest only: asks the server to price the wanted lines and keeps them only when the changed
   * offer can be bought, so a guest cannot hold a line the API would refuse for an account.
   */
  const saveGuestLines = useCallback(
    async (lines: CartLine[], changedOfferId: string, forKey: string): Promise<CartItemView> => {
      const quote = await quoteCart(lines);
      const priced = quote.items.find((item) => item.offerId === changedOfferId);
      if (quote.unknownOfferIds.includes(changedOfferId) || !priced) {
        throw new ApiError("Không tìm thấy mặt hàng yêu cầu.", 404);
      }
      if (!priced.available) {
        throw new ApiError(priced.problem ?? "Sản phẩm hiện không khả dụng hoặc đã ngừng kinh doanh.", 400);
      }
      const kept = withoutUnknown(quote, lines);
      writeGuestLines(lines.filter((line) => !quote.unknownOfferIds.includes(line.offerId)));
      commit(forKey, kept);
      return priced;
    },
    [commit],
  );

  const addToCart = useCallback(
    (line: CartLine) =>
      run(async () => {
        const forKey = key;
        const describe = (item?: CartItemView) =>
          `Đã thêm ${line.quantity} ${item?.unit ?? ""} "${item?.productName ?? "sản phẩm"}" vào giỏ hàng!`.replace("  ", " ");

        if (token) {
          const next = await addCartItem(token, line);
          commit(forKey, next);
          return { success: true, message: describe(next.items.find((item) => item.offerId === line.offerId)) };
        }

        const lines = cleanLines([...readGuestLines(), line]);
        if (!lines.some((entry) => entry.offerId === line.offerId)) {
          throw new ApiError("Giỏ hàng tối đa 50 mặt hàng.", 400);
        }
        return { success: true, message: describe(await saveGuestLines(lines, line.offerId, forKey)) };
      }),
    [run, key, token, commit, saveGuestLines],
  );

  const updateQuantity = useCallback(
    (item: CartItemView, quantity: number) =>
      run(async () => {
        const forKey = key;
        if (token && item.id) {
          commit(forKey, await updateCartItem(token, item.id, quantity));
          return { success: true, message: "Đã cập nhật số lượng." };
        }
        const lines = readGuestLines().map((line) =>
          line.offerId === item.offerId ? { ...line, quantity: roundQuantity(quantity) } : line,
        );
        await saveGuestLines(lines, item.offerId, forKey);
        return { success: true, message: "Đã cập nhật số lượng." };
      }),
    [run, key, token, commit, saveGuestLines],
  );

  const removeItem = useCallback(
    (item: CartItemView) =>
      run(async () => {
        const forKey = key;
        if (token && item.id) {
          commit(forKey, await removeCartItem(token, item.id));
          return { success: true, message: "Đã xóa khỏi giỏ hàng." };
        }
        const lines = readGuestLines().filter((line) => line.offerId !== item.offerId);
        if (lines.length === 0) {
          clearGuestLines();
          commit(forKey, EMPTY_CART);
        } else {
          writeGuestLines(lines);
          commit(forKey, withoutUnknown(await quoteCart(lines), lines));
        }
        return { success: true, message: "Đã xóa khỏi giỏ hàng." };
      }),
    [run, key, token, commit],
  );

  const removeItems = useCallback(
    (targets: CartItemView[]) =>
      run(async () => {
        const forKey = key;
        const done = { success: true, message: `Đã xóa ${targets.length} sản phẩm khỏi giỏ hàng.` };
        if (targets.length === 0) return { success: true, message: "Chưa chọn sản phẩm nào." };

        if (token) {
          let latest: CartView | null = null;
          try {
            for (const item of targets) if (item.id) latest = await removeCartItem(token, item.id);
          } catch (error) {
            // Some lines may already be gone: show what the server holds now, then report the failure.
            setReloads((count) => count + 1);
            throw error;
          }
          if (latest) commit(forKey, latest);
          return done;
        }

        const drop = new Set(targets.map((item) => item.offerId));
        const lines = readGuestLines().filter((line) => !drop.has(line.offerId));
        if (lines.length === 0) {
          clearGuestLines();
          commit(forKey, EMPTY_CART);
        } else {
          writeGuestLines(lines);
          commit(forKey, withoutUnknown(await quoteCart(lines), lines));
        }
        return done;
      }),
    [run, key, token, commit],
  );

  const clearCart = useCallback(
    () =>
      run(async () => {
        const forKey = key;
        if (token) commit(forKey, await clearServerCart(token));
        else {
          clearGuestLines();
          commit(forKey, EMPTY_CART);
        }
        return { success: true, message: "Đã xóa tất cả sản phẩm khỏi giỏ hàng." };
      }),
    [run, key, token, commit],
  );

  const value = useMemo<CartContextType>(
    () => ({
      items: cart.items,
      vendors: cart.vendors,
      itemCount: cart.lineCount,
      totalPrice: cart.subtotal,
      hasProblems: cart.hasProblems,
      isSignedIn: token !== null,
      isLoading,
      loadError,
      isBusy,
      addToCart,
      updateQuantity,
      removeItem,
      removeItems,
      clearCart,
      refresh: () => setReloads((count) => count + 1),
    }),
    [cart, token, isLoading, loadError, isBusy, addToCart, updateQuantity, removeItem, removeItems, clearCart],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartToast toast={toast} onClose={clearToast} />
    </CartContext.Provider>
  );
}

/** A priced guest cart without the offers that no longer exist, which are also dropped from the browser. */
function withoutUnknown(quote: QuoteView, lines: CartLine[]): CartView {
  if (quote.unknownOfferIds.length > 0) {
    const unknown = new Set(quote.unknownOfferIds);
    writeGuestLines(lines.filter((line) => !unknown.has(line.offerId)));
  }
  const { unknownOfferIds: _unknown, ...cart } = quote;
  void _unknown;
  return cart;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
