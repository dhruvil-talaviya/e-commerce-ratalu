import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * On-demand cache invalidation for the storefront.
 *
 * Content is server-rendered with a 60s cache, which is what keeps the site
 * fast — but a CMS whose edits take a minute to appear is broken. The Website
 * Builder calls this the moment a section is published so the change is live
 * immediately, without giving up caching for every other visitor.
 */
export async function POST() {
  // "layout" scope: the CMS provider lives in the root layout, so every
  // storefront route needs re-rendering, not just "/".
  revalidatePath("/", "layout");

  return NextResponse.json({ revalidated: true, at: Date.now() });
}
