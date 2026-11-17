import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web-prototype',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
});
