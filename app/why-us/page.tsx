import type { Metadata } from "next";
import { getPageContent } from "@/lib/cms-server";
import WhyUsClient from "./why-us-client";

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getPageContent("whyus");
  const details = cms?.content?.details as any;

  return {
    title: details?.metaTitle || "Why Us",
    description: details?.metaDescription || "Crafting the ultimate guilt-free gourmet snack. Sourced responsibly, cooked traditionally, seasoned by hand.",
  };
}

export default async function WhyUsPage() {
  // Two sources: this page's own header copy ("whyus"), and the SAME
  // "why-choose-us" grid the Website Builder edits on the homepage — so an edit
  // there now appears here too, not only on the home page.
  const [cms, homepageCms] = await Promise.all([
    getPageContent("whyus"),
    getPageContent("homepage"),
  ]);

  return <WhyUsClient initialCms={cms} homepageCms={homepageCms} />;
}
