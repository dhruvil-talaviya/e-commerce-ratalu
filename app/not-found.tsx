import Link from "next/link";
import { Home, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaferVisual } from "@/components/common/wafer-visual";
import { FLAVORS } from "@/lib/data/flavors";

export default function NotFound() {
  return (
    <div className="bg-radial-cream">
      <div className="container-px mx-auto flex max-w-2xl flex-col items-center gap-8 py-28 text-center">
        <div className="relative size-48">
          <div className="absolute inset-6 rounded-full border border-dashed border-purple-200 animate-spin-slow" />
          <WaferVisual flavor={FLAVORS[2]} />
        </div>
        <div>
          <p className="font-serif text-7xl font-bold text-purple-700">404</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold text-charcoal">
            This page crumbled away
          </h1>
          <p className="mt-3 text-lg text-charcoal-muted">
            The page you&apos;re looking for doesn&apos;t exist — but our wafers definitely do.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/">
              <Home /> Back home
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/shop">
              <ShoppingBag /> Shop flavours
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
