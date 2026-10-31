import { writeFile } from 'node:fs/promises';
import { rigSvg } from '../src/assets/hero/leaf-rig.js';
await writeFile(new URL('../public/assets/hero/npc-dandelion-leaf-rig.svg', import.meta.url), rigSvg());
