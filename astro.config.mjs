import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

export default defineConfig({
  output: 'static',
  integrations: [
    vue({ appEntrypoint: '/src/entrypoint' }),
  ],
  vite: {
    define: {
      'process.env': {},
    },
    build: {
      minify: 'esbuild',
      cssMinify: true,
      target: 'esnext',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'vue-router', 'pinia'],
            leaflet: ['leaflet', 'leaflet.markercluster'],
          },
        },
      },
    },
  },
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
});
