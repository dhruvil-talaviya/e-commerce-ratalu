"use client";

import * as React from "react";
import { useParams, notFound } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { getPolicy } from "@/lib/data/policies";
import { CmsProvider, useSection } from "@/components/cms/cms-provider";

export default function PolicyPage() {
  const params = useParams() as { slug?: string };
  const slug = params?.slug || "";
  const policy = getPolicy(slug);
  if (!policy) notFound();

  // Map slug to PageKey
  const pageKey = slug === "refunds" ? "refund" : slug;

  return (
    <CmsProvider page={pageKey}>
      <PolicyView defaultPolicy={policy} />
    </CmsProvider>
  );
}

function formatCmsBody(body: string): string {
  if (!body) return "";

  // Normalize headings by ensuring they start on newlines
  let normalized = body
    .replace(/(?:\s+|\n)*(##|#)\s+([^#\n\r]+?)(?=\s+(?:##|#)|\n|\r|$)/g, "\n\n$1 $2\n\n");

  let html = normalized
    // Convert ## Heading
    .replace(/^##\s+(.+)$/gm, '<h2 class="font-serif text-2xl font-semibold text-charcoal mt-8 mb-4">$1</h2>')
    // Convert # Heading
    .replace(/^#\s+(.+)$/gm, '<h1 class="font-serif text-3xl font-bold text-charcoal mt-10 mb-6">$1</h1>')
    // Convert bullet lists
    .replace(/^\-\s+(.+)$/gm, '<li class="list-disc ml-6 text-charcoal-muted mb-2">$1</li>');

  // Convert double newlines to paragraph tags
  const paragraphs = html.split(/\r?\n\r?\n/).map(p => p.trim()).filter(Boolean);
  const wrapped = paragraphs.map(p => {
    if (p.startsWith("<h") || p.startsWith("<li")) {
      return p;
    }
    // Convert single newlines inside paragraph to <br/>
    return `<p class="text-lg leading-relaxed text-charcoal-muted mb-4">${p.replace(/\r?\n/g, "<br/>")}</p>`;
  });

  return wrapped.join("\n");
}

function PolicyView({ defaultPolicy }: { defaultPolicy: any }) {
  // Load page details from CMS section "details"
  const cms = useSection("details", {
    title: defaultPolicy.title,
    subtitle: defaultPolicy.summary,
    body: defaultPolicy.sections.map((s: any) => `## ${s.heading}\n\n${s.body.join("\n\n")}`).join("\n\n")
  });

  const formattedHtml = formatCmsBody(cms.body || "");

  return (
    <>
      <PageHeader
        eyebrow="Policies"
        title={cms.title || defaultPolicy.title}
        description={cms.subtitle || defaultPolicy.summary}
        crumbs={[{ label: "Home", href: "/" }, { label: cms.title || defaultPolicy.title }]}
      />

      <article className="container-px mx-auto max-w-3xl py-12">
        <div 
          className="prose prose-purple max-w-none"
          dangerouslySetInnerHTML={{ __html: formattedHtml }}
        />

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
