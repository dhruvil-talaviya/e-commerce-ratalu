import { Sprout, Sun, Droplets, MapPin } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/common/reveal";
import { AnimatedCounter } from "@/components/common/animated-counter";

const POINTS = [
  { icon: MapPin, title: "Grown in Gujarat", body: "Sourced direct from trusted purple-yam farms across Saurashtra." },
  { icon: Sun, title: "Peak-season harvest", body: "Picked at ripeness for the sweetest, nuttiest flavour." },
  { icon: Droplets, title: "Cold-pressed oils", body: "Only light, clean sunflower oil — never reused, never palm." },
  { icon: Sprout, title: "Nothing artificial", body: "No colours, no MSG, no preservatives. Ever." },
];

export function FarmFresh() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-20 lg:py-24">
      <div className="container-px mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Visual panel */}
        <Reveal direction="right" className="order-2 lg:order-1">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-green-700 via-green-800 to-purple-800 p-8 text-cream shadow-[var(--shadow-lift)] sm:p-10">
            <div className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full bg-gold-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-10 size-56 rounded-full bg-green-400/20 blur-3xl" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold-300 backdrop-blur">
                <Sprout className="size-3.5" /> Farm to pack
              </span>
              <p className="mt-6 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
                From soil to shelf in under{" "}
                <span className="text-gold-300">
                  <AnimatedCounter value={24} suffix="h" />
                </span>
              </p>
              <p className="mt-4 max-w-md text-cream/80">
                We don&apos;t stockpile. Yam is harvested, hand-washed, sliced and kettle-cooked in
                small daily batches — so every pack tastes garden-fresh.
              </p>

              <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/15 pt-6">
                <Stat value={<AnimatedCounter value={100} suffix="%" />} label="Natural" />
                <Stat value={<AnimatedCounter value={0} />} label="Preservatives" />
                <Stat value={<AnimatedCounter value={6} />} label="Bold flavours" />
              </div>
            </div>
          </div>
        </Reveal>

        {/* Copy */}
        <div className="order-1 lg:order-2">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">
              <span className="size-1.5 rounded-full bg-orange-500" />
              Farm fresh
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 font-serif text-4xl font-semibold leading-tight text-charcoal sm:text-5xl">
              Real ingredients you can <span className="text-gradient-warm">actually pronounce</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 text-lg leading-relaxed text-charcoal-muted">
              Great chips start long before the kettle. Ours begin at the farm, with purple yam
              chosen by hand and a promise to keep everything honest and clean.
            </p>
          </Reveal>

          <RevealGroup className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {POINTS.map((p) => {
              const Icon = p.icon;
              return (
                <RevealItem key={p.title} className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-green-50 text-green-700">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
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

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <p className="font-serif text-2xl font-bold text-cream sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-cream/70">{label}</p>
    </div>
  );
}
