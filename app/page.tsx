import { Hero } from "@/components/sections/hero";
import { BestSellers } from "@/components/sections/best-sellers";
import { OffersStrip } from "@/components/sections/offers-strip";
import { FlavorShowcase } from "@/components/sections/flavor-showcase";
import { FarmFresh } from "@/components/sections/farm-fresh";
import { About } from "@/components/sections/about";
import { HowItsMade } from "@/components/sections/how-its-made";
import { WhyChooseUs } from "@/components/sections/why-choose-us";
import { Reviews } from "@/components/sections/reviews";
import { InstagramGallery } from "@/components/sections/instagram-gallery";
import { Faq } from "@/components/sections/faq";
import { ProductJsonLd, FaqJsonLd } from "@/components/seo/json-ld";

export default function HomePage() {
  return (
    <>
      <ProductJsonLd />
      <FaqJsonLd />

      {/* Hook */}
      <Hero />
      <BestSellers />
      <OffersStrip />

      {/* Explore */}
      <FlavorShowcase />

      {/* Trust & story */}
      <FarmFresh />
      <About />
      <HowItsMade />
      <WhyChooseUs />

      {/* Social proof */}
      <Reviews />
      <InstagramGallery />

      {/* Convert */}
      <div className="pb-24">
        <Faq />
      </div>
    </>
  );
}
