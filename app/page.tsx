import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { FlavorShowcase } from "@/components/sections/flavor-showcase";
import { WhyChooseUs } from "@/components/sections/why-choose-us";
import { Reviews } from "@/components/sections/reviews";
import { Faq } from "@/components/sections/faq";
import { Newsletter } from "@/components/sections/newsletter";
import { ProductJsonLd, FaqJsonLd } from "@/components/seo/json-ld";

export default function HomePage() {
  return (
    <>
      <ProductJsonLd />
      <FaqJsonLd />
      <Hero />
      <About />
      <FlavorShowcase />
      <WhyChooseUs />
      <Reviews />
      <Faq />
      <div className="pb-24 pt-4">
        <Newsletter />
      </div>
    </>
  );
}
