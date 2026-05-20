import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import type { App } from 'vue';

export default (app: App) => {
  const pinia = createPinia();
  if (typeof window !== 'undefined') {
    pinia.use(piniaPluginPersistedstate);
  }
  app.use(pinia);
};
