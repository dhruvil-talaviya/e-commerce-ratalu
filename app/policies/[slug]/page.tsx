import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { POLICIES, getPolicy } from "@/lib/data/policies";

export function generateStaticParams() {
  return POLICIES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const policy = getPolicy(slug);
  if (!policy) return { title: "Policy not found" };
  return {
    title: policy.title,
    description: policy.summary,
    alternates: { canonical: `/policies/${policy.slug}` },
  };
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const policy = getPolicy(slug);
  if (!policy) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Policies"
        title={policy.title}
        description={policy.summary}
        crumbs={[{ label: "Home", href: "/" }, { label: policy.title }]}
      />

      <article className="container-px mx-auto max-w-3xl py-12">
        <p className="mb-10 text-sm text-charcoal-soft">Last updated: {policy.updated}</p>
        <div className="flex flex-col gap-10">
          {policy.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-serif text-2xl font-semibold text-charcoal">{section.heading}</h2>
              <div className="mt-3 flex flex-col gap-3">
                {section.body.map((p, i) => (
                  <p key={i} className="text-lg leading-relaxed text-charcoal-muted">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-[var(--color-border)] bg-white/70 p-6 text-center">
          <p className="text-charcoal-muted">
            Questions about this policy?{" "}
            <a href="/contact" className="font-medium text-purple-600 underline-offset-4 hover:underline">
              Get in touch
            </a>
            .
          </p>
        </div>
      </article>
    </>
  );
}
