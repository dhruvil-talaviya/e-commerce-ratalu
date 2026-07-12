import type { Metadata } from "next";
import { WhyChooseUs } from "@/components/sections/why-choose-us";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = {
  title: "Why Choose Ratalu",
  description: "Six bold promises behind every single pack of our kettle-cooked purple yam wafers. No compromises, ever.",
  alternates: { canonical: "/why-us" },
};

export default function WhyUsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Our Promises"
        title={
          <>
            Why Choose <span className="text-gradient-warm">Ratalu Chips</span>
          </>
        }
        description="Crafting the ultimate guilt-free gourmet snack. Sourced responsibly, cooked traditionally, seasoned by hand."
        crumbs={[{ label: "Home", href: "/" }, { label: "Why Us" }]}
      />
      <div className="pb-12">
        <WhyChooseUs />
      </div>
    </>
  );
}
