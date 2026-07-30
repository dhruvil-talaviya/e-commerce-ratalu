import { Hero } from "@/components/sections/hero";
import { FlavorShowcase } from "@/components/sections/flavor-showcase";
import { ComboSection } from "@/components/sections/combo-section";
import { FullWidthCarousel } from "@/components/sections/full-width-carousel";
import { BestSellers } from "@/components/sections/best-sellers";
import { Reviews } from "@/components/sections/reviews";
import { InstagramGallery } from "@/components/sections/instagram-gallery";
import { Faq } from "@/components/sections/faq";
import { ProductJsonLd, FaqJsonLd } from "@/components/seo/json-ld";

export default function HomePage() {
  return (
    <>
      <ProductJsonLd />
      <FaqJsonLd />

      {/* 1. Hero Banner */}
      <Hero />

      {/* 2. Shop Products (Flavours Showcase) */}
      <FlavorShowcase />

      {/* 3. Super Value Combos */}
      <ComboSection />

      {/* 4. Photo & Video Slider Carousel */}
      <FullWidthCarousel />

      {/* 5. Best Sellers */}
      <BestSellers />

      {/* 6. Customer Reviews */}
      <Reviews />

      {/* 7. Instagram Community Feed */}
      <InstagramGallery />

      {/* 8. FAQ (Last) */}
      <Faq />
    </>
  );
}
