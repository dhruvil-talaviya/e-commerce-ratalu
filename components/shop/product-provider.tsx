"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";
import { useLiveRefresh } from "@/lib/hooks/use-live-refresh";
import type { Flavor } from "@/lib/types";

interface ProductContextValue {
  flavors: Flavor[];
  hydrated: boolean;
  getFlavor: (id: string) => Flavor | undefined;
  getFlavorBySlug: (slug: string) => Flavor | undefined;
  addProduct: (flavor: Omit<Flavor, "id" | "slug">) => Promise<void>;
  updateProduct: (id: string, updated: Omit<Flavor, "id" | "slug">) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  refreshProducts: () => Promise<void>;
}

const ProductContext = React.createContext<ProductContextValue | null>(null);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [flavors, setFlavors] = React.useState<Flavor[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  const fetchFlavors = React.useCallback(async () => {
    try {
      const data = await apiFetch<Flavor[]>("/products");
      setFlavors(data);
    } catch (err) {
      console.error("Failed to load catalog products from backend:", err);
    } finally {
      setHydrated(true);
    }
  }, []);

  // Fetch catalog on mount
  React.useEffect(() => {
    fetchFlavors();
  }, [fetchFlavors]);

  useLiveRefresh(fetchFlavors, { minIntervalMs: 2500 });

  const getFlavor = React.useCallback(
    (id: string) => flavors.find((f) => f.id === id),
    [flavors]
  );

  const getFlavorBySlug = React.useCallback(
    (slug: string) => flavors.find((f) => f.slug === slug),
    [flavors]
  );

  const addProduct = React.useCallback(async (newFlavor: Omit<Flavor, "id" | "slug">) => {
    await apiFetch("/products", {
      method: "POST",
      body: newFlavor
    });
    await fetchFlavors(); // refresh state
  }, [fetchFlavors]);

  const updateProduct = React.useCallback(async (id: string, updated: Omit<Flavor, "id" | "slug">) => {
    await apiFetch(`/products/${id}`, {
      method: "PUT",
      body: updated
    });
    await fetchFlavors(); // refresh state
  }, [fetchFlavors]);

  const deleteProduct = React.useCallback(async (id: string) => {
    await apiFetch(`/products/${id}`, {
      method: "DELETE"
    });
    await fetchFlavors(); // refresh state
  }, [fetchFlavors]);

  const value = React.useMemo(
    () => ({
      flavors,
      hydrated,
      getFlavor,
      getFlavorBySlug,
      addProduct,
      updateProduct,
      deleteProduct,
      refreshProducts: fetchFlavors
    }),
    [flavors, hydrated, getFlavor, getFlavorBySlug, addProduct, updateProduct, deleteProduct, fetchFlavors]
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

export function useProducts() {
  const context = React.useContext(ProductContext);
  if (!context) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
}
