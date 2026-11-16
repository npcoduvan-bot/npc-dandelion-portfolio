import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://npc-dandelion-portfolio.pages.dev',
  output: 'static',
  integrations: [sitemap()]
});
