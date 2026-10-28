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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    // Seed initial demo cart state with 1 item (755.000đ total as visible in header design)
    return [
      {
        id: "cart-item-initial",
        productId: "prod-2",
        productName: "Cá Hồi Na Uy Tươi Cắt Thỏi",
        productImage:
          "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=400&q=80",
        price: 755000,
        quantity: 1,
        unit: "kg",
        preparationOption: "Hút chân không",
        vendorName: "Hải Sản Nhập Khẩu Sài Gòn Ocean",
      },
    ];
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("haisan_cart");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
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
