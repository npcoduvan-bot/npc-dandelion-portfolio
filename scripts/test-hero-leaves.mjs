import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initHeroLeaves } from '../src/scripts/hero-leaves.js';

// Input/accessibility contracts are tested without a GPU or a browser.
for (const scenario of [
  { name: 'reduced motion never decodes or starts animation', desktop: true, reduced: true, pointer: 'mouse' },
  { name: 'mobile/coarse pointers keep the original artwork', desktop: false, reduced: false, pointer: 'mouse' },
  { name: 'touch on a desktop hybrid does not start animation', desktop: true, reduced: false, pointer: 'touch' },
  { name: 'pen input does not start mouse-only animation', desktop: true, reduced: false, pointer: 'pen' },
  { name: 'hidden documents do not start animation', desktop: true, reduced: false, pointer: 'mouse', hidden: true },
]) {
  test(scenario.name, async () => {
    const handlers = new Map();
    let decodes = 0, paints = 0;
    const image = { decode: async () => { decodes++; } };
    const host = { querySelector: () => image, classList: { remove() {} } };
    const stage = { addEventListener: (type, fn) => handlers.set(type, fn) };
    const originals = new Map();
    const replace = (key, value) => { originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { value, configurable: true, writable: true }); };
    replace('window', { addEventListener() {} });
    replace('document', { hidden: !!scenario.hidden, addEventListener() {} });
    replace('matchMedia', query => ({ matches: query.includes('reduced-motion') ? scenario.reduced : scenario.desktop, addEventListener() {} }));
    replace('IntersectionObserver', class { observe() {} });
    replace('requestAnimationFrame', () => { paints++; });
    replace('cancelAnimationFrame', () => {});
    try {
      initHeroLeaves(stage, host);
      await handlers.get('pointermove')({ pointerType: scenario.pointer, clientX: 800, clientY: 300 });
      assert.equal(decodes, 0);
      assert.equal(paints, 0);
    } finally {
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    }
  });
}
