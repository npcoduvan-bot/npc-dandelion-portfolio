import { ART_WIDTH, ART_HEIGHT, LEAVES, rigSvg } from '../assets/hero/leaf-rig.js';
let nextFilterId = 0;
const LEAF_MASK = '/assets/hero/npc-dandelion-leaf-isolation.png';
const BACKGROUND_MASK = '/assets/hero/npc-dandelion-background-mask.png';

// Progressive enhancement: the original <img> is always the rest/mobile/error
// state. Complementary masks separate stationary pixels from the foliage only
// while it is moving; both layers continue to use the same original texture.
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
        const leafMask = new Image();
        leafMask.src = LEAF_MASK;
        const backgroundMask = new Image();
        backgroundMask.src = BACKGROUND_MASK;
        await Promise.all([mask.decode(), leafMask.decode(), backgroundMask.decode()]);
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
  const lineMaskId = `${filterId}-line`;
  const cutMaskId = `${filterId}-line-cut`;
  const repairId = `${filterId}-line-underlay`;
  const leafMaskId = `${filterId}-foliage`;
  const backgroundMaskId = `${filterId}-background`;
  svg.innerHTML = `<defs><filter id="${filterId}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="-24" y="-24" width="1584" height="1200" color-interpolation-filters="sRGB">
    <feImage x="0" y="0" width="1536" height="1152" preserveAspectRatio="none" href="${maskUrl}" result="weights"/>
    <feColorMatrix in="weights" type="matrix" result="offset"/>
    <feDisplacementMap in="SourceGraphic" in2="offset" scale="48" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <mask id="${leafMaskId}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1152" style="mask-type:luminance">
    <image href="${LEAF_MASK}" width="1536" height="1152"/>
  </mask>
  <mask id="${backgroundMaskId}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1152" style="mask-type:luminance">
    <image href="${BACKGROUND_MASK}" width="1536" height="1152"/>
  </mask>
  <mask id="${lineMaskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1152">
    <rect width="1536" height="1152" fill="black"/>
    <path d="M1100 827 C1140 813 1187 804 1234 800 C1278 797 1324 799 1360 809 C1380 814 1390 817 1400 821" fill="none" stroke="white" stroke-width="6" stroke-linecap="round"/>
  </mask>
  <mask id="${cutMaskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1152">
    <rect width="1536" height="1152" fill="white"/>
    <path d="M1100 827 C1140 813 1187 804 1234 800 C1278 797 1324 799 1360 809 C1380 814 1390 817 1400 821" fill="none" stroke="black" stroke-width="6" stroke-linecap="round"/>
  </mask>
  <filter id="${repairId}" filterUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1152" color-interpolation-filters="sRGB">
    <feOffset in="SourceGraphic" dy="-6" result="above"/>
    <feOffset in="SourceGraphic" dy="6" result="below"/>
    <feComposite in="above" in2="below" operator="arithmetic" k2=".5" k3=".5"/>
  </filter></defs>`;
  const makeImage = () => {
    const image = document.createElementNS(ns, 'image');
    image.setAttribute('href', source.currentSrc || source.src);
    image.setAttribute('width', String(ART_WIDTH));
    image.setAttribute('height', String(ART_HEIGHT));
    return image;
  };
  // This line crosses the right leaf in the flattened image. Keep its actual
  // original pixels on a stationary layer; fill the tiny gap underneath from
  // neighbouring original pixels before bending the leaf. At rest the untouched
  // original <img> is shown, so the visible source artwork is never replaced.
  // The displacement map operates on foliage pixels only. The complementary
  // layer stays in place, so neighbouring decorative lines are never warped.
  const background = makeImage();
  background.setAttribute('mask', `url(#${backgroundMaskId})`);
  const moving = document.createElementNS(ns, 'g');
  moving.setAttribute('filter', `url(#${filterId})`);
  const foliage = document.createElementNS(ns, 'g');
  foliage.setAttribute('mask', `url(#${leafMaskId})`);
  const clean = makeImage();
  clean.setAttribute('filter', `url(#${repairId})`);
  clean.setAttribute('mask', `url(#${lineMaskId})`);
  const base = makeImage();
  base.setAttribute('mask', `url(#${cutMaskId})`);
  foliage.append(base, clean);
  moving.append(foliage);
  const fixedLine = makeImage();
  fixedLine.setAttribute('mask', `url(#${lineMaskId})`);
  // Only the portion crossing foliage needs this overlay; outside it the
  // exact original line already belongs to the stationary background layer.
  const crossing = document.createElementNS(ns, 'g');
  crossing.setAttribute('mask', `url(#${leafMaskId})`);
  crossing.append(fixedLine);
  svg.append(background, moving, crossing);
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
