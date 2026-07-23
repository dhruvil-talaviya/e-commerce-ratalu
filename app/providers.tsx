"use client";

import { CartProvider } from "@/components/cart/cart-provider";
import { WishlistProvider } from "@/components/cart/wishlist-provider";
import { AccountProvider } from "@/components/account/account-provider";
import { ProductProvider } from "@/components/shop/product-provider";
import { OrderProvider } from "@/components/shop/order-provider";
import { StoreSettingsProvider } from "@/components/common/settings-provider";
import { LanguageProvider } from "@/components/common/language-provider";
import { CartSheet } from "@/components/cart/cart-sheet";
import { Toaster } from "@/components/ui/toast";

/** Client-side context providers shared across the whole app. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AccountProvider>
        <StoreSettingsProvider>
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

