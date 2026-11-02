import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';

const requireFromAstro = createRequire(import.meta.resolve('astro'));
const sharp = requireFromAstro('sharp');
const folder = new URL('../public/assets/hero/', import.meta.url);
const input = await readFile(new URL('npc-dandelion-leaf-isolation.png', folder));
const output = await sharp(input).negate().png().toBuffer();
await writeFile(new URL('npc-dandelion-background-mask.png', folder), output);
