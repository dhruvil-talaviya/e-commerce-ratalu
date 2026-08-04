"use client";

import { CartProvider } from "@/components/cart/cart-provider";
import { WishlistProvider } from "@/components/cart/wishlist-provider";
import { AccountProvider } from "@/components/account/account-provider";
import { ProductProvider } from "@/components/shop/product-provider";
import { OrderProvider } from "@/components/shop/order-provider";
import { StoreSettingsProvider, type StoreSettings } from "@/components/common/settings-provider";
import { LanguageProvider } from "@/components/common/language-provider";
import { CartSheet } from "@/components/cart/cart-sheet";
import { Toaster } from "@/components/ui/toast";

/** Client-side context providers shared across the whole app. */
export function Providers({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  /** Server-fetched store settings passed from the RSC root layout so the
   *  logo/favicon are correct on the very first render — no flash. */
  initialSettings?: Partial<StoreSettings> | null;
}) {
  return (
    <LanguageProvider>
      <AccountProvider>
        <StoreSettingsProvider initialSettings={initialSettings}>
          <ProductProvider>
            <OrderProvider>
              <WishlistProvider>
                <CartProvider>
                  {children}
                  <CartSheet />
                  <Toaster />
                </CartProvider>
              </WishlistProvider>
            </OrderProvider>
          </ProductProvider>
        </StoreSettingsProvider>
      </AccountProvider>
    </LanguageProvider>
  );
}


