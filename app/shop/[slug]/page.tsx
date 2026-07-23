"use client";

import * as React from "react";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { useProducts } from "@/components/shop/product-provider";
import { ProductDetailClient } from "@/components/shop/product-detail-client";
import { PreviewBanner } from "@/components/shop/preview-banner";
import { apiFetch } from "@/lib/api";
import { useAccount, isAdminSession } from "@/components/account/account-provider";
import type { Flavor } from "@/lib/types";

export default function ProductDetailPage() {
  return (
    <React.Suspense fallback={null}>
      <ProductDetailView />
    </React.Suspense>
  );
}

function ProductDetailView() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;

  const { getFlavorBySlug, hydrated } = useProducts();
  const { user, hydrated: accountReady } = useAccount();

  const isPreview = searchParams.get("preview") === "1";
  const isAdmin = isAdminSession(user);

  const [draft, setDraft] = React.useState<Flavor | null>(null);
  const [loadingDraft, setLoadingDraft] = React.useState(false);

  /**
   * In preview mode the admin sees THIS page — the real customer product page —
   * rendered with the unpublished draft. Nothing else about the page changes,
   * so what they approve is exactly what ships. Guarded to admins: the preview
   * endpoint is admin-only, and a customer adding ?preview=1 simply sees the
   * live product.
   */
  React.useEffect(() => {
    if (!isPreview || !accountReady || !isAdmin || !slug) return;

    let alive = true;
    setLoadingDraft(true);

    apiFetch<Flavor>(`/admin/products/${slug}/preview`)
      .then((data) => {
        if (alive) setDraft(data);
      })
      .catch(() => {
        // Fall through to the live product rather than blanking the page.
      })
      .finally(() => {
        if (alive) setLoadingDraft(false);
      });

    return () => {
      alive = false;
    };
  }, [isPreview, accountReady, isAdmin, slug]);

  const live = getFlavorBySlug(slug);
  const flavor = draft ?? live;

  const showingPreview = isPreview && isAdmin && Boolean(draft);

  if (!flavor && hydrated && !loadingDraft && !(isPreview && isAdmin)) {
    notFound();
  }

  if (!flavor) {
    // Still hydrating — returning null avoids a false notFound flash.
    return null;
  }

  return (
    <>
      {showingPreview && <PreviewBanner slug={slug} />}
      <ProductDetailClient flavor={flavor} />
    </>
  );
}
