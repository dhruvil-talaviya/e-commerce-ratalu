# Ratalu Wafers — Premium D2C Storefront

A premium, single-product Direct-to-Consumer e-commerce experience for **Ratalu Wafers**
(small-batch purple-yam wafers). Designed to feel like Apple / Nike / Nothing — minimal,
warm, food-focused and conversion-obsessed.

> **Crispy. Natural. Irresistible.**

---

## Tech stack

| Layer      | Choice |
|------------|--------|
| Framework  | **Next.js 16** (App Router, RSC, Turbopack) — a superset of the requested Next 15 |
| Language   | TypeScript (strict) |
| Styling    | Tailwind CSS **v4** (CSS-first `@theme` tokens) |
| UI         | shadcn-style primitives on Radix (Accordion, Dialog, Slot) |
| Animation  | Framer Motion (`motion`) |
| Icons      | lucide-react (+ custom brand glyphs) |
| Fonts      | Playfair Display (headings) · Inter (body) via `next/font` |

Backend (Express + MongoDB Atlas), Auth (NextAuth), Payments (Razorpay),
Media (Cloudinary) and the Admin panel are **planned phases** — see the roadmap below.
Environment variables for all of them are scaffolded in [`.env.example`](.env.example).

---

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
```

No environment variables are required to run Phase 1.

---

## What's built (Phase 1 — Storefront)

**Design system** — `app/globals.css`
Exact brand palette (Deep Purple `#5B2C6F`, Sweet Potato Orange `#E67E22`, Cream `#FFF8F0`,
Charcoal `#2C2C2C`, Golden Yellow `#F4C542`), elevation, motion easing and keyframes as
Tailwind v4 `@theme` tokens. Respects `prefers-reduced-motion`.

**Pages**

| Route | Description |
|-------|-------------|
| `/` | Home: Hero (parallax) → About → Flavour Showcase → Why Choose Us → Reviews (marquee) → FAQ → Newsletter |
| `/shop` | Full catalogue with heat filter + sort, pack-size selector (100g/200g/500g/1kg), quantity, wishlist |
| `/checkout` | Guest/login checkout, address form, UPI/Card/Net-banking selector, live summary, order confirmation |
| `/account` | Customer dashboard: Profile · Orders · Addresses · Wishlist · Rewards · Coupons |
| `/contact` | Contact form + details |
| `/policies/[slug]` | Shipping, Returns, Refunds, Privacy, Terms, FSSAI (SSG) |
| `not-found` | Branded 404 |

**Cart** — a slide-over (`components/cart/cart-sheet.tsx`) with `localStorage` persistence,
quantity steppers, **coupons**, **GST (5%)**, **free-shipping progress**, shipping estimate and
delivery ETA. State lives in a typed React context (`cart-provider.tsx`); wishlist in
`wishlist-provider.tsx`.

**Product visuals** — `components/common/wafer-visual.tsx` generates an art-directed,
per-flavour SVG "wafer stack" (deterministic so SSR matches CSR). Swap its internals for
`<CldImage />` when Cloudinary photography lands — layouts stay identical.

**SEO** — per-route metadata, Open Graph + Twitter cards, a generated OG image
(`app/opengraph-image.tsx`), JSON-LD (Organization, Website, Product, FAQPage), dynamic
`sitemap.ts`, `robots.ts` and a web manifest.

**Motion** — scroll reveals, staggered grids, animated counters, marquees, sticky scroll-aware
navbar, slide-over transitions, page micro-interactions — all reduced-motion aware.

---

## Project structure

```
app/
  layout.tsx            Root layout: fonts, metadata, providers, chrome
  page.tsx              Homepage composition
  globals.css           Design tokens (@theme) + keyframes
  shop/ account/ checkout/ contact/ policies/[slug]/
  opengraph-image.tsx  sitemap.ts  robots.ts  manifest.ts  icon.svg
components/
  ui/                   shadcn-style primitives (button, card, badge, accordion, input, sheet)
  layout/               navbar, footer, announcement-bar, logo, social-icons
  sections/             hero, about, flavor-showcase, flavor-card, why-choose-us, reviews, faq, newsletter
  shop/                 product-card, shop-grid
  cart/                 cart-provider, wishlist-provider, cart-sheet
  common/               reveal, section-heading, page-header, heat-meter, star-rating, animated-counter, wafer-visual
  seo/                  json-ld
lib/
  constants.ts  types.ts  utils.ts
  data/                 flavors, products, reviews, faq, coupons, policies
```

All content (flavours, pricing, reviews, FAQs, coupons, policies) lives in typed modules under
`lib/data/` — the single source of truth that the MongoDB backend hydrates.

---

## Roadmap (next phases)

1. **Backend & data** — Express API + Mongoose schema on MongoDB Atlas; move `lib/data/*` into the DB.
2. **Auth** — NextAuth (email + Google), protected account routes, address book.
3. **Payments** — Razorpay order creation, checkout, webhook verification, order records.
4. **Media** — Cloudinary product photography via `next/image` (config already added).
5. **Admin panel** — dashboard, orders, products, flavours, inventory, coupons, customers,
   reviews, analytics, homepage banners, settings.
6. **Marketing & analytics** — GA4, GTM, Meta Pixel + Conversion API, newsletter provider,
   referral program.
7. **Hardening** — rate limiting, input validation (zod), CSRF, Helmet, secure cookies.

---

© Ratalu Wafers Pvt. Ltd. — built to feel like a premium international food brand.
