import { Leaf, Hand, Droplets, Ban, Sparkles, Clock } from "lucide-react";
import { SectionHeading } from "@/components/common/section-heading";
import { Reveal, RevealGroup, RevealItem } from "@/components/common/reveal";
import { AnimatedCounter } from "@/components/common/animated-counter";

const FEATURES = [
  {
    icon: Leaf,
    title: "Fresh Ingredients",
    body: "Sliced from just-harvested yam, never frozen or from concentrate.",
  },
  {
    icon: Hand,
    title: "Hand-Selected Ratalu",
    body: "Every root is chosen by hand for the perfect size, colour and starch.",
  },
  {
    icon: Droplets,
    title: "Premium Quality Oil",
    body: "Cold-pressed sunflower oil only — light, clean and never reused.",
  },
  {
    icon: Ban,
    title: "No Artificial Colours",
    body: "That gorgeous purple is 100% natural. No dyes, no MSG, no palm oil.",
  },
  {
    icon: Sparkles,
    title: "Perfect Crispiness",
    body: "Kettle-cooked low and slow for a signature shattering crunch.",
  },
  {
    icon: Clock,
    title: "Made Fresh",
    body: "Cooked in small batches and dispatched within days, not months.",
  },
];

const STATS = [
  { value: 100, suffix: "%", label: "Natural ingredients" },
  { value: 3, suffix: "", label: "Simple ingredients" },
  { value: 0, suffix: "", label: "Artificial colours" },
  { value: 24, suffix: "h", label: "Yam to kettle" },
];

export function WhyChooseUs() {
  return (
    <section id="why-us" className="relative scroll-mt-24 py-24">
      <div className="container-px mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Why Ratalu"
          title={
            <>
              Obsessed with the details,
              <br />
              so every bite <span className="text-gradient-warm">delights</span>
            </>
          }
          description="Six promises we make in every single pack — no compromises, ever."
        />

        <RevealGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <RevealItem
                key={f.title}
                className="group rounded-3xl border border-[var(--color-border)] bg-white/70 p-7 shadow-[var(--shadow-soft)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 text-cream shadow-[var(--shadow-soft)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-5 font-serif text-xl font-semibold text-charcoal">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-muted">{f.body}</p>
              </RevealItem>
            );
          })}
        </RevealGroup>

        {/* Stat band */}
        <Reveal className="mt-8">
          <div className="relative overflow-hidden rounded-3xl bg-purple-600 px-8 py-10 text-cream shadow-[var(--shadow-lift)]">
            <div className="pointer-events-none absolute -right-10 -top-10 size-56 rounded-full bg-orange-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 left-1/4 size-56 rounded-full bg-gold-400/20 blur-3xl" />
            <div className="relative grid grid-cols-2 gap-8 sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <p className="font-serif text-4xl font-bold text-gold-300 sm:text-5xl">
                    <AnimatedCounter value={s.value} suffix={s.suffix} />
                  </p>
                  <p className="mt-2 text-sm text-cream/80">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
