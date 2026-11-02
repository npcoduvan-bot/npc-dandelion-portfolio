import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const requireFromAstro = createRequire(import.meta.resolve('astro'));
const sharp = requireFromAstro('sharp');
const folder = new URL('../public/assets/hero/', import.meta.url);
const load = async name => {
  const bytes = await readFile(new URL(name, folder));
  return sharp(bytes).greyscale().raw().toBuffer({ resolveWithObject: true });
};
const leaf = await load('npc-dandelion-leaf-isolation.png');
const background = await load('npc-dandelion-background-mask.png');
const at = (image, x, y) => image.data[y * image.info.width + x];

test('foliage and background masks split the original without overlap or holes', () => {
  assert.deepEqual([leaf.info.width, leaf.info.height, leaf.info.channels], [1536, 1152, 1]);
  assert.deepEqual([background.info.width, background.info.height, background.info.channels], [1536, 1152, 1]);
  for (let i = 0; i < leaf.data.length; i++) {
    assert.ok(leaf.data[i] === 0 || leaf.data[i] === 255, `partial mask at ${i}`);
    assert.equal(leaf.data[i] + background.data[i], 255, `overlap or gap at ${i}`);
  }
});

test('blades and pointed ends belong to the moving layer', () => {
  for (const [x, y] of [[600, 300], [655, 578], [1022, 438], [1100, 336], [1150, 400], [1280, 244], [1295, 626], [1210, 910]]) {
    assert.equal(at(leaf, x, y), 255, `leaf point ${x},${y} must move`);
  }
});

test('representative decorative line pixels stay in the stationary layer', async () => {
  const src = await sharp(await readFile(new URL('npc-dandelion-botanical-from-master.webp', folder))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const [x, y] of [[805, 311], [904, 474], [991, 437], [1302, 561], [1300, 800], [1370, 812]]) {
    assert.ok(src.data[(y * 1536 + x) * 4 + 3] > 40, `expected a visible line at ${x},${y}`);
    assert.equal(at(background, x, y), 255, `line point ${x},${y} must remain stationary`);
  }
});
