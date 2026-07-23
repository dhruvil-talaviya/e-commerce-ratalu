"use client";

import * as React from "react";
import { WhyChooseUs } from "@/components/sections/why-choose-us";
import { PageHeader } from "@/components/common/page-header";
import { useStoreSettings } from "@/components/common/settings-provider";
import { CmsProvider, useSection } from "@/components/cms/cms-provider";
import type { CmsPageData } from "@/lib/cms-server";

export default function WhyUsClient({
  initialCms,
  homepageCms,
}: {
  initialCms: CmsPageData;
  homepageCms: CmsPageData;
}) {
  return (
    <CmsProvider page="whyus" initial={initialCms as any}>
      <WhyUsView homepageCms={homepageCms} />
    </CmsProvider>
  );
}

function WhyUsView({ homepageCms }: { homepageCms: CmsPageData }) {
  const { settings } = useStoreSettings();

  // Load page details from CMS section "details"
  const cms = useSection("details", {
    title: settings?.whyUsTitle || "Why Choose Ratalu Chips",
    body: settings?.whyUsDescription || "Crafting the ultimate guilt-free gourmet snack. Sourced responsibly, cooked traditionally, seasoned by hand.",
  });

  return (
    <>
      <PageHeader
        eyebrow="Our Promises"
        title={cms.title}
        description={cms.body}
        crumbs={[{ label: "Home", href: "/" }, { label: "Why Us" }]}
      />
      {/*
        The grid reads the "why-choose-us" section from the HOMEPAGE content, so
        it stays in sync with the Website Builder. A nested provider swaps the
        page context just for this subtree.
      */}
      <div className="pb-12">
        <CmsProvider page="homepage" initial={homepageCms as any}>
          <WhyChooseUs />
        </CmsProvider>
      </div>
    </>
  );
}
