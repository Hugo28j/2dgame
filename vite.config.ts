import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/2dgame/' : '/',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
}));
