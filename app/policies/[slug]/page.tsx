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

  return (
    <CmsProvider page={slug}>
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
    .replace(/^##\s+(.+)$/gm, '<h2 class="font-serif text-2xl font-bold text-gray-900 mt-10 mb-4 pb-2 border-b border-gray-100">$1</h2>')
    // Convert # Heading
    .replace(/^#\s+(.+)$/gm, '<h1 class="font-serif text-3xl font-bold text-gray-900 mt-10 mb-6">$1</h1>')
    // Bold formatting
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    // Italic formatting
    .replace(/\*(.*?)\*/g, '<em class="italic text-gray-700">$1</em>')
    // Convert bullet lists (standard *, -, or •)
    .replace(/^(?:•|-|\*)\s+(.+)$/gm, '<div class="flex items-start gap-2.5 my-1.5 ml-2"><span class="text-purple-600 font-bold mt-1.5 text-xs">•</span><span class="text-gray-700 leading-relaxed text-base sm:text-lg">$1</span></div>');

  // Split double newlines into blocks
  const blocks = html.split(/\r?\n\r?\n/).map(p => p.trim()).filter(Boolean);
  const wrapped = blocks.map(b => {
    if (b.startsWith("<h") || b.startsWith("<div")) {
      return b;
    }
    // If block contains divs (bullet list lines), return as is without wrapping in <p>
    if (b.includes("<div class=\"flex items-start")) {
      return b;
    }
    // Convert single newlines inside paragraph to <br/>
    return `<p class="text-base sm:text-lg leading-relaxed text-gray-700 mb-5">${b.replace(/\r?\n/g, "<br/>")}</p>`;
  });

  return wrapped.join("\n");
}

function PolicyView({ defaultPolicy }: { defaultPolicy: any }) {
  const defaultBody = React.useMemo(() => {
    return defaultPolicy.sections
      .map((s: any) => `## ${s.heading}\n\n${s.body.join("\n\n")}`)
      .join("\n\n");
  }, [defaultPolicy]);

  const cms = useSection("details", {
    title: defaultPolicy.title,
    subtitle: defaultPolicy.summary,
    body: defaultBody
  });

  const title = cms.title || defaultPolicy.title;
  const description = cms.subtitle || defaultPolicy.summary;
  const formattedHtml = formatCmsBody(cms.body || defaultBody);

  return (
    <>
      <PageHeader
        eyebrow="Policies"
        title={title}
        description={description}
        crumbs={[{ label: "Home", href: "/" }, { label: title }]}
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
