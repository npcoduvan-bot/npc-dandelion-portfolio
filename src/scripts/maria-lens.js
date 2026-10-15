// The nine-blade geometry and opening cadence come from Maria's original lens.
// This isolated demonstration never changes the portfolio header or scroll position.
document.querySelectorAll('[data-maria-lens]').forEach((lens) => {
  const blades = lens.querySelector('[data-blades]');
  const label = lens.querySelector('.maria-iris-label');
  const ringA = lens.querySelector('.maria-ring-a');
  const ringB = lens.querySelector('.maria-ring-b');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const paths = Array.from({ length: 9 }, () => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    blades.append(path);
    return path;
  });
  let open = false;
  let closure = 1;
  let frame = 0;
  function draw(value) {
    const radius = 232;
    const inside = radius * (1 - value);
    const twist = value * .17;
    const point = (r, a) => `${(200 + r * Math.cos(a)).toFixed(2)} ${(200 + r * Math.sin(a)).toFixed(2)}`;
    paths.forEach((path, index) => {
      const a0 = -Math.PI / 2 + index / 9 * 2 * Math.PI;
      const a1 = -Math.PI / 2 + (index + 1) / 9 * 2 * Math.PI;
      path.setAttribute('d', `M ${point(radius, a0)} L ${point(radius, a1)} L ${point(inside, a1 + twist)} L ${point(inside, a0 + twist)} Z`);
    });
    blades.style.visibility = value < .0001 ? 'hidden' : 'visible';
    label.style.visibility = value === 1 ? 'visible' : 'hidden';
    // Once initialized, the actual blades form the background of the closed label.
    label.style.background = 'transparent';
    ringA.style.transform = `rotate(${(1 - value) * 52}deg)`;
    ringB.style.transform = `rotate(${(1 - value) * -37.44}deg)`;
  }
  function setOpen(next) {
    if (open === next) return;
    open = next;
    lens.setAttribute('aria-pressed', String(open));
    cancelAnimationFrame(frame);
    const from = closure;
    const target = open ? 0 : 1;
    const start = performance.now();
    const duration = reducedMotion.matches ? 0 : (open ? 830 : 920) * Math.pow(Math.abs(target - from), .77);
    label.style.visibility = 'hidden';
    function tick(now) {
      const t = duration ? Math.min(1, (now - start) / duration) : 1;
      closure = t === 1 ? target : from + (target - from) * (.5 - Math.cos(Math.PI * t) / 2);
      draw(closure);
      frame = t < 1 ? requestAnimationFrame(tick) : 0;
    }
    if (reducedMotion.matches) tick(start);
    else frame = requestAnimationFrame(tick);
  }
  lens.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') setOpen(true); });
  lens.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse') setOpen(false); });
  lens.addEventListener('click', () => setOpen(!open));
  lens.addEventListener('blur', () => setOpen(false));
  lens.addEventListener('keydown', (event) => { if (event.key === 'Escape') setOpen(false); });
  draw(1);
});
