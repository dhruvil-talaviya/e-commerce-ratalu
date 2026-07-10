import type { Metadata } from "next";
import { About } from "@/components/sections/about";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = {
  title: "Our Story",
  description: "Learn how we turned a traditional monsoon favorite purple yam (ratalu) into premium, hand-cooked wafers.",
  alternates: { canonical: "/our-story" },
};

export default function OurStoryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Our Heritage"
        title={
          <>
            A Humble Yam, <span className="text-gradient-warm">Reimagined</span>
          </>
        }
        description="Born in Gujarat, kettle-cooked in small batches, and seasoned with local pride."
        crumbs={[{ label: "Home", href: "/" }, { label: "Our Story" }]}
      />
      <div className="pb-12">
        <About />
      </div>
    </>
  );
}
