/** Replacement for `gatsby-plugin-smoothscroll`. */
export default function scrollTo(selector: string) {
  if (typeof document === 'undefined' || !selector) return;
  try {
    const el = document.querySelector(selector);
    el?.scrollIntoView({ behavior: 'smooth' });
  } catch {
    // invalid selector — no-op (matches plugin's silent behavior)
  }
}
