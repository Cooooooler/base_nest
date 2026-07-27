import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  layout: {
    title: '@umijs/max',
  },
  routes: [],
  npmClient: 'pnpm',
  extraPostCSSPlugins: [tailwindcss()],
});
