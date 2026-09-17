(() => {
  'use strict';
  if (!/^\/(?:index\.html)?$/.test(location.pathname)) return;

  document.documentElement.classList.add('stellar-home-v5');

  const progress = document.createElement('div');
  progress.className = 'stellar-scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  const updateProgress = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const pct = Math.min(100, Math.max(0, (scrollY / max) * 100));
    progress.style.width = `${pct}%`;
  };
  addEventListener('scroll', updateProgress, { passive: true });
  addEventListener('resize', updateProgress, { passive: true });
  updateProgress();

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frame = document.querySelector('.product-frame');
  if (!frame || reduceMotion || matchMedia('(max-width: 760px)').matches) return;

  let raf = 0;
  const reset = () => {
    cancelAnimationFrame(raf);
    frame.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) translateZ(0)';
  };
  frame.addEventListener('pointermove', (event) => {
    const rect = frame.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      frame.style.transform = `perspective(1200px) rotateX(${(-y * 3.6).toFixed(2)}deg) rotateY(${(x * 4.4).toFixed(2)}deg) translateZ(0)`;
    });
  }, { passive: true });
  frame.addEventListener('pointerleave', reset, { passive: true });
})();
