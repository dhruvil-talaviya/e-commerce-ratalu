# Enterprise CMS & Marketing Hub — Audit Report

**Method:** every claim below was tested against the running backend and database, not read from code.
**Verdict:** the backend is ~90% built. **Four of six sections are unreachable because of one routing bug.**

---

## 1. The headline finding

`admin.routes.js` is mounted at `/admin`:

```js
// routes/index.js
router.use('/admin', adminRoutes);
```

…but nine routes inside it were *also* declared with an `/admin` prefix:

```js
// routes/admin.routes.js
router.get('/admin/media', ...)      // → real path: /api/v1/admin/admin/media
router.get('/admin/templates', ...)  // → real path: /api/v1/admin/admin/templates
```

So their real paths are **doubled**. Proven live:

| Path the UI calls | Result | Path that actually works |
|---|---|---|
| `/admin/media` | **404** | `/admin/admin/media` → 200 |
| `/admin/templates` | **404** | `/admin/admin/templates` → 200 |
| `/admin/inquiries` | **404** | `/admin/admin/inquiries` → 200 |

**The features are built. The URLs are wrong.** This is a one-line fix per route.

Affected routes (all in `admin.routes.js`):
```
get    /admin/social-links
put    /admin/social-links/:id
get    /admin/inquiries
put    /admin/inquiries/:id
get    /admin/media
put    /admin/media/:id
delete /admin/media/:id
get    /admin/templates
put    /admin/templates/:id
```

---

## 2. Section-by-section status

| Section | Backend | Data | Reachable from UI | Works? |
|---|---|---|---|---|
| **Global Settings & SEO** | ✅ `/admin/settings` | ✅ 1 doc, ~90 fields | ✅ 200 | **✅ Working** |
| **Media Library** | ✅ built | ✅ 2 files | ❌ 404 (double prefix) | **❌ Broken** |
| **WhatsApp Templates** | ✅ built | ✅ **7 templates seeded** | ❌ 404 (double prefix) | **❌ Broken** |
| **Customer Inquiries** | ✅ built | ⚠️ 0 docs | ❌ 404 (double prefix) | **❌ Broken** |
| **Social Media Links** | ⚠️ partial | ❌ **0 docs** | ⚠️ hits the *public* route | **❌ Empty** |
| **Admin Security** | ⚠️ `PUT` only | — | ❌ UI does `GET` → 404 | **❌ Broken** |

### The templates already exist — you just can't see them
```
whatsapp.product_inquiry   "Hello, I am interested in the product: {Pr…"
whatsapp.order_inquiry     "Hello, I would like to know the status of …"
whatsapp.refund_support    "Hello, I need assistance regarding my refu…"
whatsapp.bulk_order        "Hello, I would like to place a wholesale o…"
whatsapp.general_support   "Hello, I need assistance regarding your pr…"
email.welcome              "Hello {Customer Name}, Thank you for join…"
email.order_confirmation   "Hello {Customer Name}, We have received y…"
```

### Two further bugs beyond the prefix

**a) Social links resolve to the wrong handler.** There are two routes:
- `router.get('/social-links', getPublicSocialLinks)` → `/admin/social-links` ✅ *(public, no auth)*
- `router.get('/admin/social-links', getAdminSocialLinks)` → `/admin/admin/social-links` ❌

The admin UI calls `/admin/social-links` and therefore silently hits the **public** handler. Even after the prefix fix, the collection is **empty (0 docs)** — it needs seeding from the current hardcoded values.

**b) Admin Security is method-mismatched.** The server only registers `PUT /security`. The UI issues a `GET` → 404. It needs a `GET` handler.

---

## 3. Nothing reaches the customer yet

| Storefront surface | Source today |
|---|---|
| Footer social icons | ❌ hardcoded `SITE.social` in `lib/constants.ts` |
| WhatsApp float button | ✅ reads `settings` from the DB |
| WhatsApp message text | ❌ templates exist but no storefront consumer |
| Product / order inquiry links | ❌ not built |

So even once the admin screens work, **editing a social link or a WhatsApp template changes nothing on the live site** — the storefront doesn't read them.

---

## 4. What is genuinely working

- **Website Builder** (`/admin/website`) — 12 page sections, draft → publish → version history → restore. Fully working, on the new console.
- **Products** (`/admin/products`) — draft → preview on the real storefront → publish. Fully working.
- **Global Settings / SEO** — ~90 fields persisting correctly (GST, analytics IDs, robots.txt, verification tags).
- **Media upload** — `POST /media/upload` works (images + video, 25 MB).

---

## 5. UI/UX problems

1. **It's in the wrong place.** The Hub is a **1,425-line tab inside the 3,000-line legacy dashboard monolith**, not on the new console shell. It has none of the design system: no `DataTable`, no skeletons, no empty/error states, no confirmation dialogs.
2. **Six unrelated concerns in one tab** — SEO, media, WhatsApp, social, inquiries, admin security. Each deserves its own route.
3. **Failures are silent.** Because the fetches 404, sections render blank rather than saying "couldn't load".
4. **No draft/publish**, unlike Products and the Website Builder. Edits here go straight live.

---

## 6. Recommended fix order

**Phase 1 — make it work (small, high value)**
1. Strip the redundant `/admin` prefix from the nine routes.
2. Add `GET /admin/security`.
3. Point the admin social-links call at the admin handler, and **seed `sociallinks` from the current hardcoded `SITE.social`** (lossless).

**Phase 2 — make it reach customers**
4. Wire the footer/header social icons to the DB.
5. Wire WhatsApp templates into the floating button, product page and order page (variable interpolation already exists in `message.service.js`).

**Phase 3 — make it good**
6. Split the Hub into real routes on the console shell: `/admin/settings`, `/admin/media`, `/admin/whatsapp`, `/admin/social`, `/admin/inquiries`.
7. Rebuild each on `DataTable` + the shared primitives, with skeletons, empty/error states, and confirmations.

Phase 1 is roughly an hour and turns four dead sections live. Phase 2 is what actually changes the customer's experience.
