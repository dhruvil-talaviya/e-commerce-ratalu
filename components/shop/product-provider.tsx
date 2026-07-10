"use client";

import * as React from "react";
import { FLAVORS as STATIC_FLAVORS } from "@/lib/data/flavors";
import type { Flavor } from "@/lib/types";

interface ProductContextValue {
  flavors: Flavor[];
  hydrated: boolean;
  getFlavor: (id: string) => Flavor | undefined;
  getFlavorBySlug: (slug: string) => Flavor | undefined;
  addProduct: (flavor: Omit<Flavor, "id" | "slug">) => void;
  updateProduct: (id: string, updated: Omit<Flavor, "id" | "slug">) => void;
  deleteProduct: (id: string) => void;
}

const ProductContext = React.createContext<ProductContextValue | null>(null);

const STORAGE_KEY = "ratalu.products.v2";

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [flavors, setFlavors] = React.useState<Flavor[]>(STATIC_FLAVORS);
  const [hydrated, setHydrated] = React.useState(false);

  // Load from local storage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTimeout(() => setFlavors(parsed), 0);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flavors));
  }, [flavors, hydrated]);

  const getFlavor = React.useCallback(
    (id: string) => flavors.find((f) => f.id === id),
    [flavors]
  );

  const getFlavorBySlug = React.useCallback(
    (slug: string) => flavors.find((f) => f.slug === slug),
    [flavors]
  );

  const addProduct = React.useCallback((newFlavor: Omit<Flavor, "id" | "slug">) => {
    const slug = newFlavor.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const id = slug; // unique id from slug

    const flavor: Flavor = {
      ...newFlavor,
      id,
      slug,
    };

    setFlavors((prev) => [...prev, flavor]);
  }, []);

  const updateProduct = React.useCallback((id: string, updated: Omit<Flavor, "id" | "slug">) => {
    setFlavors((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const slug = updated.name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        return {
          ...f,
          ...updated,
          slug, // Keep slug synchronized if name changes
        };
      })
    );
  }, []);

  const deleteProduct = React.useCallback((id: string) => {
    setFlavors((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const value = React.useMemo(
    () => ({
      flavors,
      hydrated,
      getFlavor,
      getFlavorBySlug,
      addProduct,
      updateProduct,
      deleteProduct,
    }),
    [flavors, hydrated, getFlavor, getFlavorBySlug, addProduct, updateProduct, deleteProduct]
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
