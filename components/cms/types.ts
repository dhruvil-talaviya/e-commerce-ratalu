/**
 * Shapes of the content each section type stores in MongoDB.
 *
 * These mirror what the Website Builder's editors produce. They're the contract
 * between the admin editor and the storefront renderer — if you add a field to
 * one, add it here so the other side can't silently ignore it.
 *
 * Every field is optional on purpose: content comes from a Mixed field in Mongo,
 * so a section saved before a field existed simply won't have it, and the
 * renderer must survive that rather than crash.
 */

/** A counter in a stat band, e.g. "100% Natural". */
export interface CmsStat {
  value: number;
  suffix?: string;
  decimals?: number;
  label: string;
}

/** One card in a feature grid. `icon` is a name from the icon registry. */
export interface CmsFeature {
  icon?: string;
  title: string;
  body: string;
}

/** why-choose-us, how-its-made, farm-fresh, about — all the same shape. */
export interface FeatureGridContent extends Record<string, unknown> {
  eyebrow?: string;
  title?: string;
  /**
   * Trailing words rendered in the warm gradient, e.g.
   * title "Five steps to the" + highlight "perfect crunch".
   * Kept as a separate field so the design's accent survives being editable —
   * a single plain string would have quietly dropped it.
   */
  titleHighlight?: string;
  description?: string;
  features?: CmsFeature[];
  stats?: CmsStat[];
  /** The dark side-panel in the farm-fresh layout. */
  panel?: {
    badge?: string;
    headline?: string;
    headlineValue?: number;
    headlineSuffix?: string;
    body?: string;
    /**
     * A photo or video shown in place of the gradient stat card — e.g. footage
     * of the farm or the kettle. Blank = the default card.
     */
    media?: string;
    /** Hide the side panel entirely; the copy then goes full width. */
    hidden?: boolean;
  };
  /** The "Est. 2021 · Rajkot" pill on the about collage. */
  badge?: {
    year?: string;
    location?: string;
  };
  /**
   * About section only: a real photo or video for the "Our Story" visual. When
   * set it replaces the four generated wafer tiles — so the store can show how
   * the yam is grown or the chips are made. Blank = the tile collage.
   */
  media?: string;
  /** Hide the visual column entirely (story text goes full width). */
  hideVisual?: boolean;
}

/** The scrolling strip at the very top of the page. */
export interface AnnouncementContent extends Record<string, unknown> {
  enabled?: boolean;
  items?: { text: string; icon?: string; link?: string }[];
  backgroundColor?: string;
  textColor?: string;
  speed?: number;
}

/** Email capture block. */
export interface NewsletterContent extends Record<string, unknown> {
  enabled?: boolean;
  badge?: string;
  title?: string;
  description?: string;
  placeholder?: string;
  buttonLabel?: string;
  loadingLabel?: string;
  successMessage?: string;
  errorMessage?: string;
  terms?: string;
  privacyLink?: string;
  backgroundImage?: string;
}

/** Instagram-style grid. `flavorIndex` points at the flavour whose visual is shown. */
export interface GalleryContent extends Record<string, unknown> {
  eyebrow?: string;
  title?: string;
  titleHighlight?: string;
  handle?: string;
  /** `{handle}` is substituted with the handle above. */
  description?: string;
  /**
   * How many posts to render. The grid used to show whatever was in the array
   * with no way to cap it.
   */
  postLimit?: number;

  /**
   * A post is a real picture and a real link.
   *
   * These were fabricated: a `flavorIndex` picking a generated gradient swatch,
   * and a hardcoded `likes` count (1284, 2043, …) presented to customers as
   * engagement that never happened. `image` and `link` are what an actual
   * Instagram post has; `flavorIndex` remains only as the fallback visual when
   * no image has been uploaded yet.
   */
  posts?: {
    image?: string;
    link?: string;
    caption?: string;
    flavorIndex?: number;
  }[];
}

/**
 * Just the heading for a section whose body is data-driven (products, coupons,
 * reviews). These sections used to hardcode their eyebrow/title/description, so
 * the Website Builder rows that "edited" them changed nothing on the live site.
 */
export interface HeadingContent extends Record<string, unknown> {
  eyebrow?: string;
  title?: string;
  titleHighlight?: string;
  description?: string;
}
