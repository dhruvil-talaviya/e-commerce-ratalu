import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why Choose Ratalu",
  description: "Six bold promises behind every single pack of our kettle-cooked purple yam wafers. No compromises, ever.",
  alternates: { canonical: "/why-us" },
};

export default function WhyUsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
