import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Story",
  description: "Learn how we turned a traditional monsoon favorite purple yam (ratalu) into premium, hand-cooked wafers.",
  alternates: { canonical: "/our-story" },
};

export default function OurStoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
