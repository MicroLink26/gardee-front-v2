<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useCategoriesStore } from '../../stores/categories';

interface Filters {
  categories: string[];
  minRating: number;
  maxPrice: number;
}

const props = defineProps<{
  modelValue: Filters;
  maxPriceLimit?: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [Filters];
}>();

const categoriesStore = useCategoriesStore();
const expanded = ref(false);
const showOnMobile = ref(false);

onMounted(() => {
  categoriesStore.load();
  // Show expanded on mobile by default
  showOnMobile.value = window.innerWidth < 768;
});

function toggleCategory(catId: string) {
  const categories = [...props.modelValue.categories];
  const idx = categories.indexOf(catId);
  if (idx >= 0) {
    categories.splice(idx, 1);
  } else {
    categories.push(catId);
  }
  emit('update:modelValue', { ...props.modelValue, categories });
}

function updateMinRating(val: number) {
  emit('update:modelValue', { ...props.modelValue, minRating: val });
}

function updateMaxPrice(val: number) {
  emit('update:modelValue', { ...props.modelValue, maxPrice: val });
}

function clearFilters() {
  emit('update:modelValue', { categories: [], minRating: 0, maxPrice: props.maxPriceLimit || 200 });
}

const hasActiveFilters = () =>
  props.modelValue.categories.length > 0 ||
  props.modelValue.minRating > 0 ||
  props.modelValue.maxPrice < (props.maxPriceLimit || 200);
</script>

<template>
  <div class="filters-container">
    <!-- Mobile Toggle -->
    <button v-if="showOnMobile" class="filters-toggle" @click="expanded = !expanded">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
      </svg>
      Filtres
      <span v-if="hasActiveFilters()" class="badge">{{ props.modelValue.categories.length + (props.modelValue.minRating > 0 ? 1 : 0) + (props.modelValue.maxPrice < (maxPriceLimit || 200) ? 1 : 0) }}</span>
    </button>

    <!-- Filters Panel -->
    <div class="filters-panel" :class="{ expanded: expanded || !showOnMobile }">
      <div class="filters-header">
        <h3>Filtres</h3>
        <button v-if="hasActiveFilters()" class="btn-clear" @click="clearFilters">Réinitialiser</button>
      </div>

      <!-- Categories -->
      <div class="filter-group">
        <h4>Services</h4>
        <div class="categories-list">
          <label v-for="cat in categoriesStore.categories" :key="cat._id" class="category-checkbox">
            <input
              type="checkbox"
              :checked="props.modelValue.categories.includes(cat._id)"
              @change="toggleCategory(cat._id)"
            />
            <span>{{ cat.name }}</span>
          </label>
        </div>
      </div>

      <!-- Min Rating -->
      <div class="filter-group">
        <div class="filter-label">
          <h4>Note minimale</h4>
          <span class="filter-value">{{ props.modelValue.minRating > 0 ? `${props.modelValue.minRating}+ ⭐` : 'Toutes' }}</span>
        </div>
        <input
          type="range"
          min="0"
          max="5"
          :value="props.modelValue.minRating"
          @input="updateMinRating(parseInt($event.target.value))"
          class="slider"
        />
        <div class="slider-labels">
          <span>0</span>
          <span>5</span>
        </div>
      </div>

      <!-- Max Price -->
      <div class="filter-group">
        <div class="filter-label">
          <h4>Tarif horaire</h4>
          <span class="filter-value">Jusqu'à {{ props.modelValue.maxPrice }}€/h</span>
        </div>
        <input
          type="range"
          min="10"
          :max="maxPriceLimit || 200"
          :value="props.modelValue.maxPrice"
          @input="updateMaxPrice(parseInt($event.target.value))"
          class="slider"
        />
        <div class="slider-labels">
          <span>10€</span>
          <span>{{ maxPriceLimit || 200 }}€</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filters-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filters-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-weight: 600;
  color: #3a5020;
  transition: all 0.15s;
}

.filters-toggle:hover {
  border-color: #3a5020;
  background: #f0f5e8;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: #dc2626;
  color: #fff;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: bold;
}

.filters-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f9fafb;
}

@media (max-width: 767px) {
  .filters-panel {
    max-height: 0;
    overflow: hidden;
    padding: 0;
    border: none;
    background: transparent;
    transition: max-height 0.3s ease;
  }

  .filters-panel.expanded {
    max-height: 500px;
    padding: 1.25rem;
    border: 1px solid #e5e7eb;
    background: #f9fafb;
  }
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.filters-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #1a1a0e;
}

.btn-clear {
  padding: 0.4rem 0.8rem;
  background: transparent;
  color: #3a5020;
  border: 1px solid #3a5020;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-clear:hover {
  background: #3a5020;
  color: #fff;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.filter-group h4 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #1a1a0e;
}

.filter-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-label h4 {
  margin: 0;
}

.filter-value {
  font-size: 0.8rem;
  color: #3a5020;
  font-weight: 600;
}

.categories-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.category-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  font-size: 0.9rem;
  color: #374151;
}

.category-checkbox input {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #3a5020;
}

.category-checkbox:hover {
  color: #1a1a0e;
}

.slider {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: #e5e7eb;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3a5020;
  cursor: pointer;
  transition: all 0.15s;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3a5020;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.slider::-moz-range-thumb:hover {
  transform: scale(1.2);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 0.25rem;
}
</style>
