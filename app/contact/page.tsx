import type { Metadata } from "next";
import { getPageContent } from "@/lib/cms-server";
import ContactClient from "./contact-client";

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getPageContent("contact");
  const details = cms?.content?.details as any;

  return {
    title: details?.metaTitle || "Contact Us",
    description: details?.metaDescription || "Questions about an order, wholesale, or just want to tell us your favourite flavour? Drop us a line.",
  };
}

export default async function ContactPage() {
  const cms = await getPageContent("contact");
  return <ContactClient initialCms={cms} />;
}
