// Prepares a page for a stable capture and returns its layout metrics.
// It hides the Next dev overlay and scrolls the whole page once, instantly,
// so scroll-triggered reveals have run. Then it returns to the top.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  if (!document.getElementById('verify-site-style')) {
    const style = document.createElement('style');
    style.id = 'verify-site-style';
    style.textContent = 'nextjs-portal { display: none !important; }';
    document.head.append(style);
  }
  const root = document.documentElement;
  const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
  for (let y = 0; y < root.scrollHeight && y < 40000; y += step) {
    window.scrollTo({ top: y, behavior: 'instant' });
    await sleep(120);
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  await Promise.race([document.fonts.ready, sleep(3000)]);
  const pending = [...document.images].filter((img) => !img.complete);
  await Promise.race([
    Promise.all(
      pending.map(
        (img) =>
          new Promise((r) => {
            img.onload = img.onerror = r;
          }),
      ),
    ),
    sleep(5000),
  ]);
  await sleep(500);
  return {
    url: location.pathname,
    title: document.title,
    viewport: [window.innerWidth, window.innerHeight],
    scrollWidth: root.scrollWidth,
    clientWidth: root.clientWidth,
    horizontalScroll: root.scrollWidth > root.clientWidth,
    pageHeight: root.scrollHeight,
    imagesPending: [...document.images].filter((img) => !img.complete).length,
    mapError: !!document.querySelector('.gm-err-container'),
  };
})();
