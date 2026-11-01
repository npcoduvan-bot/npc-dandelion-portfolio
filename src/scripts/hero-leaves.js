import { ART_WIDTH, ART_HEIGHT, LEAVES, rigSvg } from '../assets/hero/leaf-rig.js';
let nextFilterId = 0;

// Progressive enhancement: the original <img> is always the rest/mobile/error
// state. One continuous texture avoids cutout seams and double alpha at stems.
export function initHeroLeaves(stage, host) {
  const original = host.querySelector('img');
  if (!original) return;
  const artwork = host.closest('.hero-art') || stage;
  // A narrow desktop window and a laptop whose primary pointer is touch can
  // still have a mouse or trackpad. Actual touch/pen events remain ignored.
  const desktop = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer, loading, frame = 0, lastTime = 0, idleTimer = 0, inView = true, disposed = false;
  const positions = LEAVES.map(() => [0, 0]);
  const velocities = LEAVES.map(() => [0, 0]);
  const targets = LEAVES.map(() => [0, 0]);
  const enabled = () => desktop.matches && !reduced.matches && inView && !document.hidden && !disposed;
  const reset = () => {
    clearTimeout(idleTimer);
    cancelAnimationFrame(frame); frame = 0; lastTime = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) positions[i][j] = velocities[i][j] = targets[i][j] = 0;
    host.classList.remove('is-swaying');
  };
  const create = async () => {
    if (renderer || loading || !enabled()) return loading;
    loading = (async () => {
      try {
        await original.decode();
        const mask = new Image();
        mask.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rigSvg())}`;
        await mask.decode();
        if (!enabled()) return;
        renderer = createRenderer(original, mask.src);
        host.append(renderer.element);
      } catch { /* Keep the unchanged original if the image cannot be decoded. */ }
      finally { loading = undefined; }
    })();
    return loading;
  };
  const tick = (time) => {
    frame = 0;
    if (!enabled() || !renderer) { reset(); return; }
    const dt = Math.min((lastTime ? time - lastTime : 16.67) / 1000, 0.032);
    lastTime = time;
    let moving = false;
    LEAVES.forEach((leaf, i) => {
      const frequency = 1900 / leaf.response;
      for (let axis = 0; axis < 2; axis++) {
        // Damped spring; each leaf has its own response, without an idle loop.
        const acceleration = frequency * frequency * (targets[i][axis] - positions[i][axis]) - 1.65 * frequency * velocities[i][axis];
        velocities[i][axis] += acceleration * dt;
        positions[i][axis] += velocities[i][axis] * dt;
        if (Math.abs(targets[i][axis] - positions[i][axis]) > 0.005 || Math.abs(velocities[i][axis]) > 0.01) moving = true;
      }
    });
    renderer.draw(positions);
    host.classList.add('is-swaying');
    if (moving) frame = requestAnimationFrame(tick);
    else {
      lastTime = 0;
      if (targets.every(pair => pair.every(value => value === 0))) reset();
    }
  };
  const schedule = () => { if (!frame && renderer && enabled()) frame = requestAnimationFrame(tick); };
  const move = async (event) => {
    if (event.pointerType !== 'mouse' || !enabled()) return;
    // The artwork reaches above and below the text stage. Use its visible area
    // so leaf tips under the header can respond without capturing any clicks.
    const area = artwork.getBoundingClientRect();
    if (event.clientX < area.left || event.clientX > area.right || event.clientY < Math.max(0, area.top) || event.clientY > area.bottom) { leave(); return; }
    const rect = host.getBoundingClientRect();
    const x = (event.clientX - rect.left) * ART_WIDTH / rect.width;
    const y = (event.clientY - rect.top) * ART_HEIGHT / rect.height;
    LEAVES.forEach((leaf, i) => {
      const dx = x - leaf.tip[0], dy = y - leaf.tip[1];
      const influence = Math.exp(-(dx * dx + dy * dy) / (2 * 460 * 460));
      targets[i][0] = Math.max(-1, Math.min(1, dx / 230)) * influence * leaf.amplitude[0];
      targets[i][1] = Math.max(-1, Math.min(1, dy / 250)) * influence * leaf.amplitude[1];
    });
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(leave, 650);
    await create(); schedule();
  };
  const leave = () => { clearTimeout(idleTimer); targets.forEach(pair => pair.fill(0)); schedule(); };
  const mediaChange = () => { reset(); if (!desktop.matches || reduced.matches) { renderer?.destroy(); renderer = undefined; } };
  const visibilityChange = () => { if (document.hidden) reset(); };
  const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; if (!inView) reset(); });
  observer.observe(stage);
  document.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerleave', leave, { passive: true });
  document.addEventListener('pointercancel', leave, { passive: true });
  window.addEventListener('blur', reset);
  window.addEventListener('resize', reset, { passive: true });
  document.addEventListener('visibilitychange', visibilityChange);
  desktop.addEventListener('change', mediaChange);
  reduced.addEventListener('change', mediaChange);
  document.addEventListener('astro:before-swap', () => {
    disposed = true; reset(); observer.disconnect(); renderer?.destroy();
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerleave', leave);
    document.removeEventListener('pointercancel', leave);
    window.removeEventListener('blur', reset);
    window.removeEventListener('resize', reset);
    document.removeEventListener('visibilitychange', visibilityChange);
    desktop.removeEventListener('change', mediaChange);
    reduced.removeEventListener('change', mediaChange);
  }, { once: true });
}

function createRenderer(source, maskUrl) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${ART_WIDTH} ${ART_HEIGHT}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('hero-leaves-motion');
  // The coloured rig is deformation data, never artwork. One displacement of
  // the original texture preserves translucent overlaps and leaves no cut seams.
  const filterId = `leaf-bend-${nextFilterId++}`;
  svg.innerHTML = `<defs><filter id="${filterId}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="-24" y="-24" width="1584" height="1200" color-interpolation-filters="sRGB">
    <feImage x="0" y="0" width="1536" height="1152" preserveAspectRatio="none" href="${maskUrl}" result="weights"/>
    <feColorMatrix in="weights" type="matrix" result="offset"/>
    <feDisplacementMap in="SourceGraphic" in2="offset" scale="48" xChannelSelector="R" yChannelSelector="G"/>
  </filter></defs>`;
  const art = document.createElementNS(ns, 'image');
  art.setAttribute('href', source.currentSrc || source.src);
  art.setAttribute('width', String(ART_WIDTH));
  art.setAttribute('height', String(ART_HEIGHT));
  art.setAttribute('filter', `url(#${filterId})`);
  svg.append(art);
  const matrix = svg.querySelector('feColorMatrix');
  return {
    element: svg,
    destroy() { svg.remove(); },
    draw(values) {
      const x = values.map(value => -value[0] / 48).join(' ');
      const y = values.map(value => -value[1] / 48).join(' ');
      matrix.setAttribute('values', `${x} 0 .5 ${y} 0 .5 0 0 0 0 .5 0 0 0 0 1`);
    },
  };
}
