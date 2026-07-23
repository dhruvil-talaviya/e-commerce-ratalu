"use client";

import * as React from "react";
import { About } from "@/components/sections/about";
import { PageHeader } from "@/components/common/page-header";
import { useStoreSettings } from "@/components/common/settings-provider";
import { CmsProvider, useSection } from "@/components/cms/cms-provider";
import type { CmsPageData } from "@/lib/cms-server";

export default function OurStoryClient({
  initialCms,
  homepageCms,
}: {
  initialCms: CmsPageData;
  homepageCms: CmsPageData;
}) {
  return (
    <CmsProvider page="story" initial={initialCms as any}>
      <OurStoryView homepageCms={homepageCms} />
    </CmsProvider>
  );
}

function OurStoryView({ homepageCms }: { homepageCms: CmsPageData }) {
  const { settings } = useStoreSettings();

  const cms = useSection("details", {
    title: settings?.ourStoryTitle || "A Humble Yam, Reimagined",
    subtitle: settings?.ourStoryDescription || "Born in Gujarat, kettle-cooked in small batches, and seasoned with local pride.",
  });

  return (
    <>
      <PageHeader
        eyebrow="Our Heritage"
        title={cms.title}
        description={cms.subtitle}
        crumbs={[{ label: "Home", href: "/" }, { label: "Our Story" }]}
      />
      {/*
        The "about" section reads HOMEPAGE content, so editing it in the Website
        Builder updates both the home page and this one.
      */}
      <div className="pb-12">
        <CmsProvider page="homepage" initial={homepageCms as any}>
          <About />
        </CmsProvider>
      </div>
    </>
  );
}
