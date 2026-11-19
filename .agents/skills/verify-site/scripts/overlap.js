// Checks the map area for overlaps. overlap.sh prepends `const CONFIG = {...};`.
// CONFIG.items maps a name to a CSS selector. Every visible match counts.
// Two built-in items cover Google's branding: google-logo and google-attribution.
// An element never overlaps its own ancestor, so the map's own controls don't count.
// CONFIG.allow lists other name pairs that may overlap.
// CONFIG.minTarget names a selector whose matches must measure at least CONFIG.minSize.
(() => {
  const builtIn = {
    'google-logo': '.gm-style a[href^="https://maps.google.com/maps"]',
    'google-attribution': '.gm-style-cc',
  };
  const items = { ...builtIn, ...CONFIG.items };
  const visibleRects = (selector) =>
    [...document.querySelectorAll(selector)]
      .filter((el) => getComputedStyle(el).visibility !== 'hidden')
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && r.height > 0)
      .map(({ el, r }) => ({
        el,
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
      }));
  const failures = [];
  const found = {};
  for (const [name, selector] of Object.entries(items)) {
    found[name] = visibleRects(selector);
    if (found[name].length === 0) {
      failures.push(`${name}: nothing visible matches ${selector}`);
    }
  }
  const allowed = new Set(
    (CONFIG.allow || []).flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]),
  );
  const plain = ({ x, y, w, h }) => ({ x, y, w, h });
  const tolerance = 1;
  const overlapArea = (a, b) => {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) - tolerance;
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) - tolerance;
    return w > 0 && h > 0 ? w * h : 0;
  };
  const names = Object.keys(items);
  const overlaps = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const [a, b] = [names[i], names[j]];
      if (allowed.has(`${a}|${b}`)) continue;
      if (a.startsWith('google-') && b.startsWith('google-')) continue;
      for (const ra of found[a]) {
        for (const rb of found[b]) {
          if (ra.el.contains(rb.el) || rb.el.contains(ra.el)) continue;
          const area = overlapArea(ra, rb);
          if (area > 0)
            overlaps.push({ a, b, area, ra: plain(ra), rb: plain(rb) });
        }
      }
    }
  }
  for (const o of overlaps) {
    failures.push(`${o.a} overlaps ${o.b} by ${o.area} px²`);
  }
  const small = [];
  if (CONFIG.minTarget) {
    const rects = visibleRects(CONFIG.minTarget);
    if (rects.length === 0) {
      failures.push(`min-target: nothing visible matches ${CONFIG.minTarget}`);
    }
    for (const r of rects) {
      if (r.w < CONFIG.minSize || r.h < CONFIG.minSize) small.push(plain(r));
    }
    if (small.length) {
      failures.push(
        `${small.length} target(s) under ${CONFIG.minSize}×${CONFIG.minSize} px`,
      );
    }
  }
  const root = document.documentElement;
  if (root.scrollWidth > root.clientWidth) {
    failures.push(
      `page scrolls sideways: ${root.scrollWidth} > ${root.clientWidth}`,
    );
  }
  return {
    viewport: [window.innerWidth, window.innerHeight],
    pass: failures.length === 0,
    failures,
    found: Object.fromEntries(
      Object.entries(found).map(([name, rects]) => [name, rects.map(plain)]),
    ),
    small,
  };
})();
