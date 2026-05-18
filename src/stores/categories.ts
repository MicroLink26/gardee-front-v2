import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../services/api';
import type { Category } from '../types';

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<Category[]>([]);
  const loaded = ref(false);

  async function load() {
    if (loaded.value) return;
    const { data } = await api.get('/categories');
    categories.value = data;
    loaded.value = true;
  }

  return { categories, load };
});
