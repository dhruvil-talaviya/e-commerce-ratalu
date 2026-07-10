"use client";

import * as React from "react";
import type { CartItem } from "@/lib/types";
import type { SavedAddress } from "@/components/account/account-provider";

export interface Order {
  id: string;
  userPhone: string;
  userName: string;
  items: CartItem[];
  totals: {
    subtotal: number;
    discount: number;
    gst: number;
    shipping: number;
    total: number;
  };
  address: SavedAddress;
  method: string;
  status: "Pending" | "Kettle Cooking" | "Shipped" | "Delivered";
  createdAt: string;
}

interface OrderContextValue {
  orders: Order[];
  hydrated: boolean;
  placeOrder: (
    userName: string,
    userPhone: string,
    items: CartItem[],
    totals: Order["totals"],
    address: SavedAddress,
    method: string
  ) => string;
  updateOrderStatus: (orderId: string, status: Order["status"]) => void;
  getOrdersByUser: (phone: string) => Order[];
}

const OrderContext = React.createContext<OrderContextValue | null>(null);

const STORAGE_KEY = "ratalu.orders.v2";

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  // Load from local storage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTimeout(() => setOrders(parsed), 0);
        }
      }
    } catch {
      // Ignore corrupt storage
    }
    setTimeout(() => setHydrated(true), 0);
  }, []);

  // Save to local storage
  React.useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders, hydrated]);

  const placeOrder = React.useCallback(
    (
      userName: string,
      userPhone: string,
      items: CartItem[],
      totals: Order["totals"],
      address: SavedAddress,
      method: string
    ) => {
      const id = "RW" + Math.random().toString(36).slice(2, 8).toUpperCase();
      const newOrder: Order = {
        id,
        userPhone,
        userName,
        items,
        totals,
        address,
        method,
        status: "Pending",
        createdAt: new Date().toISOString(),
      };

      setOrders((prev) => [newOrder, ...prev]);
      return id;
    },
    []
  );

  const updateOrderStatus = React.useCallback((orderId: string, status: Order["status"]) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  }, []);

  const getOrdersByUser = React.useCallback(
    (phone: string) => {
      return orders.filter((o) => o.userPhone === phone);
    },
    [orders]
  );

  const value = React.useMemo(
    () => ({
      orders,
      hydrated,
      placeOrder,
      updateOrderStatus,
      getOrdersByUser,
    }),
    [orders, hydrated, placeOrder, updateOrderStatus, getOrdersByUser]
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders() {
  const context = React.useContext(OrderContext);
  if (!context) {
    throw new Error("useOrders must be used within an OrderProvider");
  }
  return context;
}
