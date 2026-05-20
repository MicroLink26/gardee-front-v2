import { useCategoriesStore } from '../stores/categories';

export function useCategoryName() {
  const store = useCategoriesStore();

  function categoryName(id: string): string {
    return store.categories.find(c => c._id === id)?.name ?? id;
  }

  return { categoryName, categoriesStore: store };
}
