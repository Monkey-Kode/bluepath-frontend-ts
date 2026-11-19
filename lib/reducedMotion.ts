/** Whether the visitor asks for less motion (NFR-002). It is false where the browser can't tell. */
export const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
