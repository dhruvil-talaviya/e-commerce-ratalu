import { Sprout, Flame, Package, HandHeart } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/common/reveal";
import { WaferVisual } from "@/components/common/wafer-visual";
import { FLAVORS } from "@/lib/data/flavors";

const PILLARS = [
  {
    icon: Sprout,
    title: "Fresh, hand-selected",
    body: "We source purple yam at its peak and slice it within hours — never from concentrate, never frozen.",
  },
  {
    icon: Flame,
    title: "Traditional kettle-cooking",
    body: "Cooked low and slow in small batches, the old-fashioned way, for that signature shattering crunch.",
  },
  {
    icon: Package,
    title: "Premium, sealed packaging",
    body: "Nitrogen-flushed pouches lock in freshness so every pack tastes just-made when it reaches you.",
  },
  {
    icon: HandHeart,
    title: "Nothing artificial",
    body: "No artificial colours, no MSG, no palm oil. Just yam, good oil and honest seasoning.",
  },
];

export function About() {
  return (
    <section id="about" className="relative scroll-mt-24 py-24">
      <div className="container-px mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
        {/* Visual collage */}
        <Reveal direction="right" className="relative order-2 lg:order-1">
          <div className="relative mx-auto max-w-md">
            <div className="grid grid-cols-2 gap-5">
              <div className="mt-10 aspect-square rounded-3xl bg-white/70 p-4 shadow-[var(--shadow-soft)]">
                <WaferVisual flavor={FLAVORS[0]} />
              </div>
              <div className="aspect-square rounded-3xl bg-white/70 p-4 shadow-[var(--shadow-soft)]">
                <WaferVisual flavor={FLAVORS[1]} seed={2} />
              </div>
              <div className="aspect-square rounded-3xl bg-white/70 p-4 shadow-[var(--shadow-soft)]">
                <WaferVisual flavor={FLAVORS[4]} seed={3} />
              </div>
              <div className="-mt-6 aspect-square rounded-3xl bg-white/70 p-4 shadow-[var(--shadow-soft)]">
                <WaferVisual flavor={FLAVORS[2]} seed={4} />
              </div>
            </div>
            {/* Est. badge */}
            <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-[var(--color-border)] bg-cream px-5 py-2.5 shadow-[var(--shadow-lift)]">
              <span className="font-serif text-lg font-bold text-purple-700">Est. 2021</span>
              <span className="h-5 w-px bg-[var(--color-border)]" />
              <span className="text-xs font-medium text-charcoal-muted">Rajkot · Gujarat</span>
            </div>
          </div>
        </Reveal>

        {/* Story */}
        <div className="order-1 lg:order-2">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">
              <span className="size-1.5 rounded-full bg-orange-500" />
              Our Story
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 font-serif text-4xl font-semibold leading-tight text-charcoal sm:text-5xl">
              A humble yam, <span className="text-gradient-warm">reimagined.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-charcoal-muted">
              <p>
                Ratalu — the purple yam — has been a monsoon favourite in Gujarati kitchens for
                generations. We grew up on it. So we set out to do one thing exceptionally well:
                turn this humble root into the crispiest, most flavourful wafer you&apos;ve ever tasted.
              </p>
              <p>
                No shortcuts. No factory line churning out millions. Just carefully chosen yam,
                thin-sliced, kettle-cooked in small batches, and seasoned by hand with spices we&apos;d
                proudly serve our own family.
              </p>
            </div>
          </Reveal>

          <RevealGroup className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <RevealItem key={p.title} className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-purple-50 text-purple-600">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-charcoal">{p.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-charcoal-muted">{p.body}</p>
                  </div>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
