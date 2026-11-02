import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { rigSvg } from '../src/assets/hero/leaf-rig.js';

// Inspect the actual rasterized displacement mask at the previously stuck tips.
const requireFromAstro = createRequire(import.meta.resolve('astro'));
const sharp = requireFromAstro('sharp');
const { data } = await sharp(Buffer.from(rigSvg())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const value = (x, y, channel) => data[(y * 1536 + x) * 3 + channel];

test('each visible leaf blade and its pointed edges move together', () => {
  const tips = [
    [625,432,0],[655,578,0],[900,562,0],[765,698,0],
    [1100,336,1],[1024,438,1],[991,554,1],[1148,550,1],
    [1295,626,2],[1234,665,2],[1140,716,2],[1210,910,2],
  ];
  for (const [x,y,channel] of tips) assert.ok(value(x,y,channel) >= 245, `stuck tip at ${x}, ${y}`);
});

test('stem bases and background outside the foliage remain fixed', () => {
  for (const [x,y] of [[700,1070],[600,1100],[800,320],[440,138]]) {
    for (let channel=0; channel<3; channel++) assert.equal(value(x,y,channel), 0, `moving fixed point at ${x}, ${y}`);
  }
});
