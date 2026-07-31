import type { Metadata } from "next";
import { Faq } from "@/components/sections/faq";
import { PageHeader } from "@/components/common/page-header";
import { getPageContent } from "@/lib/cms-server";
import { CmsProvider } from "@/components/cms/cms-provider";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Have questions about packaging, shipping speeds, or ingredients? Find the answers here.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const cms = await getPageContent("faqs");

  return (
    <CmsProvider initial={cms} page="faqs">
      <PageHeader
        eyebrow="Help Center"
        title={
          <>
            Got Questions? <span className="text-gradient-warm">We&apos;ve got answers.</span>
          </>
        }
        description="Everything you need to know about our sourcing, shelf life, and courier delivery."
        crumbs={[{ label: "Home", href: "/" }, { label: "FAQ" }]}
      />
      <div className="pb-12">
        <Faq />
      </div>
    </CmsProvider>
  );
}
