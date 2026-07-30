"use client";

import * as React from "react";
import { useCmsOrder, useSectionVisible } from "@/components/cms/cms-provider";
import { Hero } from "@/components/sections/hero";
import { FlavorShowcase } from "@/components/sections/flavor-showcase";
import { ComboSection } from "@/components/sections/combo-section";
import { BestSellers } from "@/components/sections/best-sellers";
import { Reviews } from "@/components/sections/reviews";
import { InstagramGallery } from "@/components/sections/instagram-gallery";
import { Faq } from "@/components/sections/faq";
import { FullWidthCarousel } from "@/components/sections/full-width-carousel";

const COMPONENT_MAP: Record<string, React.ComponentType> = {
  hero: Hero,
  flavours: FlavorShowcase,
  "product-list": FlavorShowcase,
  combos: ComboSection,
  "best-sellers": BestSellers,
  testimonials: Reviews,
  reviews: Reviews,
  faqs: Faq,
  faq: Faq,
  full_width_carousel: FullWidthCarousel,
  gallery: FullWidthCarousel,
  instagram_gallery: InstagramGallery,
  "instagram-gallery": InstagramGallery,
  instagram: InstagramGallery,
};

const DEFAULT_ORDER = [
  "hero",
  "flavours",
  "combos",
  "full_width_carousel",
  "best-sellers",
  "testimonials",
  "instagram-gallery",
  "reviews",
  "faqs",
];

function SectionWrapper({ sectionKey }: { sectionKey: string }) {
  const isVisible = useSectionVisible(sectionKey);
  const Component = COMPONENT_MAP[sectionKey];

  if (!isVisible || !Component) return null;
  return <Component />;
}

export function DynamicHomepageLayout() {
  const cmsOrder = useCmsOrder();
  
  // Use CMS ordering if available, otherwise fall back to default order
  const activeOrder = React.useMemo(() => {
    if (cmsOrder && cmsOrder.length > 0) {
      // De-duplicate and filter known components
      const known = cmsOrder.filter((k) => COMPONENT_MAP[k]);
      return known.length > 0 ? known : DEFAULT_ORDER;
    }
    return DEFAULT_ORDER;
  }, [cmsOrder]);

  return (
    <div className="flex flex-col">
      {activeOrder.map((key) => (
        <SectionWrapper key={key} sectionKey={key} />
      ))}
    </div>
  );
}
