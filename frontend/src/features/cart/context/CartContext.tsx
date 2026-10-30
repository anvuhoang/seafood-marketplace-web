"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CartItem } from "@/features/product/types/product.types";

interface AddToCartParams {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  unit: string;
  preparationOption: string;
  vendorName: string;
  availableStock: number;
  isDiscontinued?: boolean;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
  addToCart: (params: AddToCartParams) => { success: boolean; message: string };
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  toastMessage: string | null;
  clearToast: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * Id of a demo item older builds put in every new cart. Browsers that saved
 * it to local storage still have it, so it is dropped when the cart loads.
 */
const LEGACY_DEMO_ITEM_ID = "cart-item-initial";

export function CartProvider({ children }: { children: React.ReactNode }) {
  // The cart starts empty; saved items are restored after mount.
  const [items, setItems] = useState<CartItem[]>([]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("haisan_cart");
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const restored = (parsed as CartItem[]).filter(
            (item) => item && item.id !== LEGACY_DEMO_ITEM_ID,
          );
          if (restored.length !== parsed.length) {
            localStorage.setItem("haisan_cart", JSON.stringify(restored));
          }
          // Defer update to avoid synchronous cascading renders during mount
          setTimeout(() => {
            setItems(restored);
          }, 0);
        }
      }
    } catch {
      // Ignore local storage parse errors in SSR
    }
  }, []);

  const saveToStorage = (updated: CartItem[]) => {
    setItems(updated);
    try {
      localStorage.setItem("haisan_cart", JSON.stringify(updated));
    } catch {
      // Ignore local storage write errors
    }
  };

  const clearToast = () => setToastMessage(null);

  const addToCart = (params: AddToCartParams) => {
    // 1. Availability validation
    if (params.isDiscontinued || params.availableStock <= 0) {
      const err = "Sản phẩm hiện không khả dụng hoặc đã hết hàng. Không thể thêm vào giỏ.";
      setToastMessage(err);
      return { success: false, message: err };
    }

    // 2. Stock enforcement
    const existingIndex = items.findIndex(
      (it) =>
        it.productId === params.productId &&
        it.preparationOption === params.preparationOption
    );

    const currentQtyInCart = existingIndex >= 0 ? items[existingIndex].quantity : 0;
    const requestedTotal = currentQtyInCart + params.quantity;

    if (requestedTotal > params.availableStock) {
      const err = `Số lượng yêu cầu (${requestedTotal} ${params.unit}) vượt quá số lượng có sẵn trong kho (${params.availableStock} ${params.unit}).`;
      setToastMessage(err);
      return { success: false, message: err };
    }

    let updated: CartItem[];
    if (existingIndex >= 0) {
      updated = [...items];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: requestedTotal,
      };
    } else {
      const newItem: CartItem = {
        id: `cart-${Date.now()}`,
        productId: params.productId,
        productName: params.productName,
        productImage: params.productImage,
        price: params.price,
        quantity: params.quantity,
        unit: params.unit,
        preparationOption: params.preparationOption,
        vendorName: params.vendorName,
      };
      updated = [newItem, ...items];
    }

    saveToStorage(updated);
    const successMsg = `Đã thêm ${params.quantity} ${params.unit} "${params.productName}" (${params.preparationOption}) vào giỏ hàng!`;
    setToastMessage(successMsg);
    return { success: true, message: successMsg };
  };

  const removeFromCart = (itemId: string) => {
    const updated = items.filter((it) => it.id !== itemId);
    saveToStorage(updated);
  };

  const clearCart = () => {
    saveToStorage([]);
  };

  const itemCount = items.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalPrice = items.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        totalPrice,
        addToCart,
        removeFromCart,
        clearCart,
        toastMessage,
        clearToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
