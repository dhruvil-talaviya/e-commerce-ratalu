"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Check, Gift, ArrowRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/common/reveal";

type Status = "idle" | "loading" | "success" | "error";

export function Newsletter() {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<Status>("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      // Wire to /api/newsletter (Mailchimp/Klaviyo) in a later phase.
      await new Promise((r) => setTimeout(r, 900));
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="container-px mx-auto max-w-7xl">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 px-6 py-16 text-cream shadow-[var(--shadow-lift)] sm:px-16">
          {/* decorative glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-orange-500/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 size-80 rounded-full bg-gold-400/20 blur-3xl" />

          <div className="relative mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold-300 backdrop-blur">
              <Gift className="size-3.5" /> 10% off your first order
            </span>
            <h2 className="mt-5 font-serif text-4xl font-semibold leading-tight text-cream sm:text-5xl">
              Join the crunch club
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-cream/80">
              New flavours, secret drops and subscriber-only deals — plus{" "}
              <span className="font-semibold text-gold-300">10% off</span> your first box the moment you sign up.
            </p>

            <div className="mx-auto mt-8 max-w-md">
              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center gap-3 rounded-full bg-white/15 px-6 py-4 backdrop-blur"
                  >
                    <span className="grid size-8 place-items-center rounded-full bg-green-400 text-purple-900">
                      <Check className="size-5" />
                    </span>
                    <p className="font-medium text-cream">
                      You&apos;re in! Check your inbox for your code.
                    </p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-3 sm:flex-row"
                  >
                    <div className="relative flex-1">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-charcoal-soft" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (status === "error") setStatus("idle");
                        }}
                        placeholder="you@example.com"
                        aria-label="Email address"
                        className="h-13 border-transparent bg-white pl-12 text-charcoal"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="accent"
                      size="lg"
                      disabled={status === "loading"}
                      className="h-13 shrink-0"
                    >
                      {status === "loading" ? (
                        <>
                          <Loader2 className="animate-spin" /> Joining
                        </>
                      ) : (
                        <>
                          Get 10% off <ArrowRight />
                        </>
                      )}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>

              {status === "error" && (
                <p className="mt-3 text-sm text-gold-200">
                  Please enter a valid email address.
                </p>
              )}
              <p className="mt-4 text-xs text-cream/60">
                No spam, ever. Unsubscribe in one click.
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
