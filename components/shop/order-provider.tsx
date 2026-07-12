"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";
import { useAccount } from "@/components/account/account-provider";
import type { CartItem } from "@/lib/types";
import type { SavedAddress } from "@/components/account/account-provider";

export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Packed"
  | "Ready for Dispatch"
  | "In Transit"
  | "Out for Delivery"
  | "Delivered"
  | "Cancelled"
  | "Refund Requested"
  | "Refund Completed"
  | "Return Requested"
  | "Return Approved";

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
  status: OrderStatus;
  createdAt: string;
  courierName?: string;
  trackingNumber?: string;
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
    method: string,
    couponCode?: string
  ) => Promise<string>;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => Promise<void>;
  assignCourier: (orderId: string, details: { courierName: string; trackingNumber: string }) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  getOrdersByUser: (phone: string) => Order[];
  loadAdminOrders: (search?: string, status?: string) => Promise<void>;
  refreshOrders: () => Promise<void>;
}

const OrderContext = React.createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, user } = useAccount();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  const fetchMyOrders = React.useCallback(async () => {
    try {
      const data = await apiFetch<Order[]>("/orders/my");
      setOrders(data);
    } catch (err) {
      console.error("Failed to load customer orders from backend:", err);
    } finally {
      setHydrated(true);
    }
  }, []);

  const loadAdminOrders = React.useCallback(async (search = "", status = "") => {
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (status) queryParams.set("status", status);

      const res = await apiFetch<Order[]>(`/admin/orders?${queryParams.toString()}`);
      setOrders(res);
    } catch (err) {
      console.error("Failed to load admin queue orders from backend:", err);
    }
  }, []);

  // Fetch orders based on login role
  React.useEffect(() => {
    if (isLoggedIn) {
      if (user?.role === "Admin") {
        loadAdminOrders();
        setHydrated(true);
      } else {
        fetchMyOrders();
      }
    } else {
      setOrders([]);
      setHydrated(true);
    }
  }, [isLoggedIn, user?.role, fetchMyOrders, loadAdminOrders]);

  const refreshOrders = React.useCallback(async () => {
    if (isLoggedIn) {
      if (user?.role === "Admin") {
        await loadAdminOrders();
      } else {
        await fetchMyOrders();
      }
    }
  }, [isLoggedIn, user?.role, fetchMyOrders, loadAdminOrders]);

  const placeOrder = React.useCallback(
    async (
      userName: string,
      userPhone: string,
      items: CartItem[],
      totals: Order["totals"],
      address: SavedAddress,
      method: string,
      couponCode?: string
    ) => {
      const res = await apiFetch<Order>("/orders", {
        method: "POST",
        body: {
          items: items.map(i => ({
            flavorId: i.flavorId,
            flavorName: i.flavorName,
            packId: i.packId,
            packLabel: i.packLabel,
            grams: i.grams,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
            gradient: i.gradient
          })),
          couponCode,
          address,
          method
        }
      });
      await refreshOrders();
      return res.id;
    },
    [refreshOrders]
  );

  const updateOrderStatus = React.useCallback(async (orderId: string, status: OrderStatus, note?: string) => {
    await apiFetch(`/admin/orders/${orderId}/status`, {
      method: "PUT",
      body: { status, note }
    });
    await refreshOrders();
  }, [refreshOrders]);

  const assignCourier = React.useCallback(async (orderId: string, details: { courierName: string; trackingNumber: string }) => {
    await apiFetch(`/admin/orders/${orderId}/courier`, {
      method: "PUT",
      body: details
    });
    await refreshOrders();
  }, [refreshOrders]);

  const cancelOrder = React.useCallback(async (orderId: string) => {
    await apiFetch(`/orders/${orderId}/cancel`, {
      method: "POST"
    });
    await refreshOrders();
  }, [refreshOrders]);

  const getOrdersByUser = React.useCallback(
    (phone: string) => {
      // For backwards compatibility or local sorting: filter the loaded orders list
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
      assignCourier,
      cancelOrder,
      getOrdersByUser,
      loadAdminOrders,
      refreshOrders
    }),
    [orders, hydrated, placeOrder, updateOrderStatus, assignCourier, cancelOrder, getOrdersByUser, loadAdminOrders, refreshOrders]
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
