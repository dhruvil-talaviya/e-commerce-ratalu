"use client";

import * as React from "react";
import { apiFetch, apiFetchEnvelope, type ApiPagination } from "@/lib/api";
import { useLiveRefresh } from "@/lib/hooks/use-live-refresh";
import { useAccount, isAdminSession } from "@/components/account/account-provider";
import type { CartItem } from "@/lib/types";
import type { SavedAddress } from "@/components/account/account-provider";

/**
 * Exactly the values the Order schema accepts — nothing else is a real status.
 *
 * This type used to list "Ready for Dispatch", "In Transit", "Return Requested"
 * and "Return Approved", none of which exist in the database. TypeScript happily
 * blessed them, the admin console offered them, and the API rejected every one
 * with a validation error.
 */
export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Preparing"
  | "Packed"
  | "Ready to Ship"
  | "Assigned to Logistics"
  | "Shipped"
  | "Out for Delivery"
  | "Delivered"
  | "Cancelled"
  | "Returned"
  | "Refund Requested"
  | "Refund Approved"
  | "Refund Completed"
  | "Payment Failed"
  | "Expired";

export interface Order {
  id: string;
  /** Running number assigned at checkout, e.g. 148. */
  orderNumber?: number;
  /** Zero-padded form the customer sees, e.g. "RW-000148". Server-derived. */
  displayId?: string;
  userPhone: string;
  userName: string;
  items: CartItem[];
  totals: {
    subtotal: number;
    discount: number;
    gst: number;
    shipping: number;
    total: number;
    gstEnabled?: boolean;
    cgst?: number;
    sgst?: number;
    igst?: number;
    gstNumber?: string;
    businessName?: string;
    businessAddress?: string;
    panNumber?: string;
    state?: string;
  };
  address: SavedAddress;
  method: string;
  status: OrderStatus;
  createdAt: string;
  courierName?: string;
  trackingNumber?: string;
  /** Auto-generated at checkout as "INV-" + id. */
  invoiceNumber?: string;
  customerNotes?: string;
  internalNotes?: string;
  payment?: {
    method: string;
    status: string;
    transactionId?: string;
    gatewayOrderId?: string;
    paidAt?: string;
    refundedAt?: string;
  };
  timeline?: { status: string; time: string; note?: string }[];
}

export interface AdminOrderQuery {
  search?: string;
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  partner?: string;
  city?: string;
  state?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: string;
  maxAmount?: string;
  sortBy?: "createdAt" | "orderNumber" | "total" | "status" | "userName";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface OrderFilterOptions {
  statuses: string[];
  paymentStatuses: string[];
  paymentMethods: string[];
  partners: string[];
  cities: string[];
  states: string[];
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
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus | null,
    details?: {
      note?: string;
      internalNotes?: string;
      customerNotes?: string;
      paymentStatus?: string;
    }
  ) => Promise<void>;
  assignCourier: (orderId: string, details: { courierName: string; trackingNumber: string }) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  getOrdersByUser: (phone: string) => Order[];
  loadAdminOrders: (query?: AdminOrderQuery) => Promise<void>;
  refreshOrders: () => Promise<void>;
  ordersLoading: boolean;
  ordersPagination: ApiPagination | null;
  orderFilterOptions: OrderFilterOptions;
  ordersLastSyncedAt: number;
}

const OrderContext = React.createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, user } = useAccount();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [hydrated, setHydrated] = React.useState(false);
  const [ordersLoading, setOrdersLoading] = React.useState(false);
  const [ordersPagination, setOrdersPagination] = React.useState<ApiPagination | null>(null);
  const [orderFilterOptions, setOrderFilterOptions] = React.useState<OrderFilterOptions>({
    statuses: [],
    paymentStatuses: [],
    paymentMethods: [],
    partners: [],
    cities: [],
    states: [],
  });
  const [ordersLastSyncedAt, setOrdersLastSyncedAt] = React.useState(0);
  const lastAdminQueryRef = React.useRef<AdminOrderQuery>({ page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" });

  const fetchMyOrders = React.useCallback(async () => {
    setOrdersLoading(true);
    try {
      const data = await apiFetch<Order[]>("/orders/my");
      setOrders(data);
      setOrdersPagination(null);
      setOrdersLastSyncedAt(Date.now());
    } catch (err) {
      console.error("Failed to load customer orders from backend:", err);
    } finally {
      setOrdersLoading(false);
      setHydrated(true);
    }
  }, []);

  const loadAdminOrders = React.useCallback(async (query: AdminOrderQuery = {}) => {
    setOrdersLoading(true);
    try {
      const merged: AdminOrderQuery = {
        ...lastAdminQueryRef.current,
        ...query,
        page: query.page ?? lastAdminQueryRef.current.page ?? 1,
        limit: query.limit ?? lastAdminQueryRef.current.limit ?? 10,
        sortBy: query.sortBy ?? lastAdminQueryRef.current.sortBy ?? "createdAt",
        sortOrder: query.sortOrder ?? lastAdminQueryRef.current.sortOrder ?? "desc",
      };
      lastAdminQueryRef.current = merged;

      const queryParams = new URLSearchParams();
      Object.entries(merged).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          queryParams.set(key, String(value));
        }
      });

      const res = await apiFetchEnvelope<Order[]>(`/admin/orders?${queryParams.toString()}`);
      setOrders(res.data || []);
      setOrdersPagination(res.pagination || null);
      setOrdersLastSyncedAt(Date.now());
    } catch (err: any) {
      if (err?.status !== 401 && err?.status !== 403) {
        console.error("Failed to load admin queue orders from backend:", err);
      }
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const loadOrderFilterOptions = React.useCallback(async () => {
    try {
      const options = await apiFetch<OrderFilterOptions>("/admin/orders/filters");
      setOrderFilterOptions({
        statuses: options?.statuses || [],
        paymentStatuses: options?.paymentStatuses || [],
        paymentMethods: options?.paymentMethods || [],
        partners: options?.partners || [],
        cities: options?.cities || [],
        states: options?.states || [],
      });
    } catch (err: any) {
      if (err?.status !== 401 && err?.status !== 403) {
        console.error("Failed to load order filter options:", err);
      }
    }
  }, []);

  /**
   * Fetch orders based on the session's role. Matched with `isAdminSession`
   * rather than `role === "Admin"` — the owner's role is "Super Admin", which a
   * literal comparison misses, silently loading the *customer* order list into
   * the admin dashboard.
   */
  const isAdmin = isAdminSession(user);

  React.useEffect(() => {
    if (isLoggedIn) {
      if (isAdmin) {
        loadAdminOrders({ page: 1, limit: lastAdminQueryRef.current.limit || 10 });
        loadOrderFilterOptions();
        setHydrated(true);
      } else {
        fetchMyOrders();
      }
    } else {
      setOrders([]);
      setHydrated(true);
    }
  }, [isLoggedIn, isAdmin, fetchMyOrders, loadAdminOrders, loadOrderFilterOptions]);

  const refreshOrders = React.useCallback(async () => {
    if (isLoggedIn) {
      if (isAdmin) {
        await Promise.all([
          loadAdminOrders(),
          loadOrderFilterOptions()
        ]);
      } else {
        await fetchMyOrders();
      }
    }
  }, [isLoggedIn, isAdmin, fetchMyOrders, loadAdminOrders, loadOrderFilterOptions]);

  useLiveRefresh(refreshOrders, { enabled: isLoggedIn, minIntervalMs: 2500 });

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

  const updateOrderStatus = React.useCallback(async (
    orderId: string,
    status: OrderStatus | null,
    details?: {
      note?: string;
      internalNotes?: string;
      customerNotes?: string;
      paymentStatus?: string;
    }
  ) => {
    await apiFetch(`/admin/orders/${orderId}/status`, {
      method: "PUT",
      body: {
        status: status || undefined,
        note: details?.note,
        internalNotes: details?.internalNotes,
        customerNotes: details?.customerNotes,
        paymentStatus: details?.paymentStatus
      }
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
      refreshOrders,
      ordersLoading,
      ordersPagination,
      orderFilterOptions,
      ordersLastSyncedAt
    }),
    [
      orders,
      hydrated,
      placeOrder,
      updateOrderStatus,
      assignCourier,
      cancelOrder,
      getOrdersByUser,
      loadAdminOrders,
      refreshOrders,
      ordersLoading,
      ordersPagination,
      orderFilterOptions,
      ordersLastSyncedAt
    ]
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
