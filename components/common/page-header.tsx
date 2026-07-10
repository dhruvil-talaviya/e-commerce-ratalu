import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  crumbs,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  crumbs?: Crumb[];
}) {
  return (
    <section className="bg-radial-cream">
      <div className="container-px mx-auto max-w-7xl pb-8 pt-12">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-sm text-charcoal-soft">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {c.href ? (
                  <Link href={c.href} className="transition-colors hover:text-purple-600">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-charcoal-muted">{c.label}</span>
                )}
                {i < crumbs.length - 1 && <ChevronRight className="size-3.5" />}
              </span>
            ))}
          </nav>
        )}

        {eyebrow && (
          <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">
            <span className="size-1.5 rounded-full bg-orange-500" />
            {eyebrow}
          </span>
        )}
        <h1 className="mt-4 font-serif text-[1.9rem] font-bold leading-tight text-charcoal xs:text-4xl sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-lg text-charcoal-muted">{description}</p>
        )}
      </div>
    </section>
  );
}
