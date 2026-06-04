import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../services/api';
import type { Category } from '../types';

const CACHE_KEY = 'categories_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  data: Category[];
  timestamp: number;
}

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<Category[]>([]);
  const loaded = ref(false);

  function isCacheValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < CACHE_TTL;
  }

  async function load() {
    if (loaded.value) return;

    // Try to load from localStorage first
    if (typeof localStorage !== 'undefined') {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const entry: CacheEntry = JSON.parse(cached);
          if (isCacheValid(entry)) {
            categories.value = entry.data;
            loaded.value = true;
            return;
          }
        }
      } catch {
        // Silently fail if cache is corrupted
      }
    }

    // Fetch from API if cache miss or invalid
    try {
      const { data } = await api.get('/categories');
      categories.value = data;

      // Update localStorage cache
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now(),
          } as CacheEntry));
        } catch {
          // Silently fail if storage is full
        }
      }
    } finally {
      loaded.value = true;
    }
  }

  return { categories, load };
});
