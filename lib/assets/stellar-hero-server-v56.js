(() => {
  const hero = document.querySelector('.public-home .oa2-hero');
  const scene = hero && hero.querySelector('.premium-server-scene');
  if (!hero || !scene || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let px = 0, py = 0, scroll = 0, frame = 0;

  const paint = () => {
    frame = 0;
    scene.style.setProperty('--hero-x', px.toFixed(3));
    scene.style.setProperty('--hero-y', py.toFixed(3));
    scene.style.setProperty('--hero-scroll', scroll.toFixed(3));
  };

  const queue = () => {
    if (!frame) frame = requestAnimationFrame(paint);
  };

  hero.addEventListener('pointermove', (event) => {
    const rect = hero.getBoundingClientRect();
    px = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    py = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    queue();
  }, { passive: true });

  hero.addEventListener('pointerleave', () => {
    px = 0;
    py = 0;
    queue();
  }, { passive: true });

  const syncScroll = () => {
    const rect = hero.getBoundingClientRect();
    const travel = Math.max(1, rect.height + window.innerHeight);
    scroll = Math.max(-1, Math.min(1, (window.innerHeight - rect.top) / travel));
    queue();
  };

  addEventListener('scroll', syncScroll, { passive: true });
  addEventListener('resize', syncScroll, { passive: true });
  syncScroll();
})();
