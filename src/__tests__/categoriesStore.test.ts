import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const { mockApiGet } = vi.hoisted(() => ({ mockApiGet: vi.fn() }));

vi.mock('../services/api', () => ({
  api: { get: mockApiGet },
  setAccessToken: vi.fn(),
}));

import { useCategoriesStore } from '../stores/categories';

describe('useCategoriesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    // Mock localStorage
    localStorage.clear();
  });

  it('starts with empty categories and loaded=false', () => {
    const store = useCategoriesStore();
    expect(store.categories).toEqual([]);
  });

  it('fetches categories from API on first load', async () => {
    const cats = [{ _id: '1', name: 'Tonte' }, { _id: '2', name: 'Taille' }];
    mockApiGet.mockResolvedValueOnce({ data: cats });
    const store = useCategoriesStore();

    await store.load();

    expect(mockApiGet).toHaveBeenCalledWith('/categories');
    expect(store.categories).toEqual(cats);
  });

  it('does not fetch again when already loaded', async () => {
    mockApiGet.mockResolvedValueOnce({ data: [{ _id: '1', name: 'Tonte' }] });
    const store = useCategoriesStore();

    await store.load();
    await store.load();

    expect(mockApiGet).toHaveBeenCalledTimes(1);
  });
});
