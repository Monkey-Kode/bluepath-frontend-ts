import { stegaClean } from 'next-sanity';

/**
 * Server-side loader that inlines Sanity-hosted SVG icons so their colors can
 * be driven by CSS. (Imported only by the Impact server component — keep it off
 * the client; it fetches at render time.)
 *
 * The icons load via <img> today, which makes their internals — the brand-blue
 * linework and the gradient "shadow" — unreachable from CSS. Fetching the raw
 * SVG and injecting it into the DOM lets the consuming component recolor the
 * blue (now `currentColor`) and transition it on hover/active, and leaves the
 * gradients addressable for future animation.
 *
 * These are Illustrator exports, which carry two hazards when several are
 * inlined into ONE document:
 *   1. Reused ids — every export declares `id="linear-gradient"`,
 *      `id="clippath"`, `id="Layer_2"`, etc. Duplicate ids cross-wire:
 *      `url(#linear-gradient)` resolves to the FIRST match in document order,
 *      so a later icon would paint an earlier icon's gradient.
 *   2. Reused `.cls-N` class names inside an internal <style> block. Inline-SVG
 *      <style> is document-global, not scoped, so those rules would clash.
 * `scopeIds` prefixes every id, id-reference, and class with a per-asset scope
 * to keep each inlined icon self-contained.
 */

// The single brand blue baked into the icon line-art; swapped for currentColor
// so the consuming element's `color` drives it. Kept in sync with the
// `--color-icon-blue` token (globals.css) used for the default (un-hovered) color.
const BRAND_BLUE = /#0f497d/gi;

/** Strip <script> tags and inline event handlers from CMS-authored SVG. */
function sanitize(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
}

/** Namespace every id, id-reference (`url(#…)`, `href="#…"`), and `.cls-N`. */
function scopeIds(svg: string, scope: string): string {
  return svg
    .replace(/id="([^"]+)"/g, `id="${scope}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${scope}-$1)`)
    .replace(/(xlink:href|href)="#([^"]+)"/g, `$1="#${scope}-$2"`)
    .replace(/\bcls-/g, `${scope}-cls-`);
}

/** Stable, valid-CSS-ident scope derived from the Sanity asset id hash. */
function scopeFor(id: string): string {
  const hash = id.match(/image-([a-f0-9]+)-/)?.[1];
  return `ic${hash?.slice(0, 8) ?? '0'}`;
}

type IconRef = { _id?: string | null; url?: string | null } | null | undefined;

async function loadOne(id: string, url: string): Promise<string | null> {
  // url arrives stega-encoded in draft/live mode (invisible chars), which would
  // corrupt the fetch — strip them first. See utils/boxAlignClass.ts.
  const clean = stegaClean(url) ?? '';
  if (!clean.endsWith('.svg')) return null;
  try {
    const res = await fetch(clean, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const raw = await res.text();
    // We inline even SVGs with an embedded raster (e.g. the Solar Projects icon
    // wraps a base64 PNG): only the vector border/line-art hue needs to recolor,
    // and base64 can't contain `cls-`/`id="`/`url(#`/`href="#"` (no hyphens,
    // quotes, or parens in the alphabet), so scopeIds can't corrupt the bitmap.
    return scopeIds(sanitize(raw), scopeFor(id)).replace(
      BRAND_BLUE,
      'currentColor',
    );
  } catch {
    return null;
  }
}

/**
 * Fetch + transform a set of icon assets, deduped by `_id`. Returns a map of
 * asset `_id` → inline SVG markup. Non-SVG or unreachable assets are omitted,
 * so callers fall back to <img> (SanityImage) when an id is absent from the map.
 */
export async function loadInlineIcons(
  sources: IconRef[],
): Promise<Record<string, string>> {
  const unique = new Map<string, string>();
  for (const s of sources) {
    if (s?._id && s.url) unique.set(s._id, s.url);
  }
  const entries = await Promise.all(
    [...unique].map(async ([id, url]) => [id, await loadOne(id, url)] as const),
  );
  const out: Record<string, string> = {};
  for (const [id, markup] of entries) {
    if (markup) out[id] = markup;
  }
  return out;
}
