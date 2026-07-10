import { SITE } from "@/lib/constants";
import { FLAVORS } from "@/lib/data/flavors";
import { PACK_SIZES } from "@/lib/data/products";
import { FAQS } from "@/lib/data/faq";
import { REVIEW_STATS } from "@/lib/data/reviews";

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

/** Product structured data for the single-product catalogue. */
export function ProductJsonLd() {
  const low = Math.min(...PACK_SIZES.map((p) => p.price));
  const high = Math.max(...PACK_SIZES.map((p) => p.price));
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: `${SITE.name} — Purple Yam Wafers`,
        description: SITE.description,
        brand: { "@type": "Brand", name: SITE.name },
        category: "Snack Foods",
        image: `${SITE.url}/og.png`,
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: REVIEW_STATS.averageRating,
          reviewCount: REVIEW_STATS.totalReviews,
        },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "INR",
          lowPrice: low,
          highPrice: high,
          offerCount: FLAVORS.length * PACK_SIZES.length,
          availability: "https://schema.org/InStock",
        },
      }}
    />
  );
}

export function FaqJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }}
    />
  );
}
