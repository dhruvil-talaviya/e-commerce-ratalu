import type { Metadata } from "next";
import { getPageContent } from "@/lib/cms-server";
import OurStoryClient from "./our-story-client";

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getPageContent("story");
  const details = cms?.content?.details as any;

  return {
    title: details?.metaTitle || "Our Story",
    description: details?.metaDescription || "Born in Gujarat, kettle-cooked in small batches, and seasoned with local pride.",
  };
}

export default async function OurStoryPage() {
  const [cms, homepageCms] = await Promise.all([
    getPageContent("story"),
    getPageContent("homepage"),
  ]);
  return <OurStoryClient initialCms={cms} homepageCms={homepageCms} />;
}
