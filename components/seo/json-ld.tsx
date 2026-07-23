import { SITE } from "@/lib/constants";
import { FLAVORS } from "@/lib/data/flavors";
import { PACK_SIZES } from "@/lib/data/products";
import { FAQS } from "@/lib/data/faq";
import { getSiteStats } from "@/lib/stats-server";
import { getPageContent } from "@/lib/cms-server";

/** Renders a JSON-LD script tag. */
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON-LD is trusted, generated content — safe to inject.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE.name,
        legalName: SITE.legalName,
        url: SITE.url,
        logo: `${SITE.url}/icon.png`,
        email: SITE.email,
        telephone: SITE.phone,
        address: {
          "@type": "PostalAddress",
          streetAddress: "Unit 7, Artisan Foods Park",
          addressLocality: "Rajkot",
          addressRegion: "Gujarat",
          postalCode: "360001",
          addressCountry: "IN",
        },
        sameAs: Object.values(SITE.social),
      }}
    />
  );
}

export function WebsiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE.name,
        url: SITE.url,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE.url}/shop?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}

/**
 * Product structured data for the single-product catalogue.
 *
 * Async and server-rendered: the rating comes from the real, counted stats.
 * `aggregateRating` is emitted ONLY when there are approved reviews — it used to
 * hardcode 4.9★ over 2,847 reviews from a mock file, which is fabricated review
 * markup and a Google manual-action risk. No reviews → no rating in the markup,
 * rather than an invented one.
 */
export async function ProductJsonLd() {
  const low = Math.min(...PACK_SIZES.map((p) => p.price));
  const high = Math.max(...PACK_SIZES.map((p) => p.price));
  const stats = await getSiteStats();

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${SITE.name} — Purple Yam Wafers`,
    description: SITE.description,
    brand: { "@type": "Brand", name: SITE.name },
    category: "Snack Foods",
    image: `${SITE.url}/og.png`,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: low,
      highPrice: high,
      offerCount: FLAVORS.length * PACK_SIZES.length,
      availability: "https://schema.org/InStock",
    },
  };

  if (stats.avgRating != null && stats.reviewCount > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: stats.avgRating,
      reviewCount: stats.reviewCount,
    };
  }

  return <JsonLd data={data} />;
}

export async function FaqJsonLd() {
  // Source of truth is the Website Builder FAQ section; fall back to the static
  // list so structured data is never empty if the content API is unreachable.
  const cms = await getPageContent("homepage");
  const items = cms.content?.faqs?.items as
    | { question?: string; answer?: string }[]
    | undefined;
  const faqs =
    Array.isArray(items) && items.some((f) => f?.question && f?.answer)
      ? items.filter((f) => f?.question && f?.answer)
      : FAQS;

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }}
    />
  );
}
