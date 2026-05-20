import { createPinia } from 'pinia';
import type { App } from 'vue';

export default (app: App) => {
  const pinia = createPinia();
  if (typeof window !== 'undefined') {
    import('pinia-plugin-persistedstate').then(({ default: plugin }) => {
      pinia.use(plugin);
    });
  }
  app.use(pinia);
};
