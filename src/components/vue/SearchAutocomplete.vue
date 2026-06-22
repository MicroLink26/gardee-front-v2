<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCategoriesStore } from '../../stores/categories';

interface Suggestion {
  type: 'service' | 'city';
  label: string;
  value: string;
  icon: string;
}

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [string];
  'select': [Suggestion];
}>();

const categoriesStore = useCategoriesStore();
const showDropdown = ref(false);
const inputRef = ref<HTMLInputElement>();

// Common French cities for gardening services
const COMMON_CITIES = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice',
  'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille',
  'Rennes', 'Reims', 'Le Havre', 'Saint-Étienne', 'Toulon',
  'Grenoble', 'Angers', 'Valence', 'Villeurbanne', 'Nanterre',
];

const suggestions = computed((): Suggestion[] => {
  const query = props.modelValue.toLowerCase().trim();
  if (!query || query.length < 2) return [];

  const results: Suggestion[] = [];

  // Add matching services
  const matchingServices = categoriesStore.categories.filter(cat =>
    cat.name.toLowerCase().includes(query)
  );
  matchingServices.slice(0, 5).forEach(cat => {
    results.push({
      type: 'service',
      label: cat.name,
      value: cat.name,
      icon: '🌿',
    });
  });

  // Add matching cities
  const matchingCities = COMMON_CITIES.filter(city =>
    city.toLowerCase().includes(query)
  );
  matchingCities.slice(0, 5).forEach(city => {
    results.push({
      type: 'city',
      label: city,
      value: city,
      icon: '📍',
    });
  });

  // If nothing matched but query is valid, show it as custom input
  if (results.length === 0 && query.length >= 2) {
    results.push({
      type: 'service',
      label: `Rechercher "${query}"`,
      value: query,
      icon: '🔍',
    });
  }

  return results;
});

function selectSuggestion(suggestion: Suggestion) {
  emit('update:modelValue', suggestion.value);
  emit('select', suggestion);
  showDropdown.value = false;
  if (inputRef.value) {
    inputRef.value.blur();
  }
}

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement;
  emit('update:modelValue', target.value);
  showDropdown.value = true;
}

function handleFocus() {
  showDropdown.value = true;
}

function handleBlur() {
  // Delay to allow click on suggestion
  setTimeout(() => {
    showDropdown.value = false;
  }, 200);
}

onMounted(() => {
  categoriesStore.load();
});
</script>

<template>
  <div class="autocomplete">
    <input
      ref="inputRef"
      :value="modelValue"
      type="search"
      placeholder="Service, ville, nom…"
      autocomplete="off"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
      class="autocomplete-input"
    />

    <div v-if="showDropdown && suggestions.length > 0" class="dropdown">
      <button
        v-for="(suggestion, idx) in suggestions"
        :key="`${suggestion.type}-${idx}`"
        type="button"
        class="suggestion"
        :class="suggestion.type"
        @click="selectSuggestion(suggestion)"
      >
        <span class="icon">{{ suggestion.icon }}</span>
        <span class="label">{{ suggestion.label }}</span>
        <span v-if="suggestion.type === 'service'" class="type-badge">Service</span>
        <span v-if="suggestion.type === 'city'" class="type-badge">Ville</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.autocomplete {
  position: relative;
  width: 100%;
}

.autocomplete-input {
  width: 100%;
  padding: 0.875rem;
  border: none;
  outline: none;
  font-size: 1rem;
  color: #1a1a0e;
  background: transparent;
  font-family: inherit;
}

.autocomplete-input::placeholder {
  color: #b5ae94;
}

.autocomplete-input::-webkit-search-cancel-button {
  display: none;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-top: none;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  max-height: 360px;
  overflow-y: auto;
  z-index: 1000;
}

.suggestion {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.875rem 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
  font-family: inherit;
  font-size: 0.95rem;
  color: #374151;
}

.suggestion:hover {
  background: #f9fafb;
}

.suggestion:active {
  background: #f3f4f6;
}

.icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.label {
  flex: 1;
  font-weight: 500;
}

.type-badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 4px;
  text-transform: uppercase;
  flex-shrink: 0;
}

.suggestion.service .type-badge {
  background: #dbeafe;
  color: #1e40af;
}

.suggestion.city .type-badge {
  background: #fef3c7;
  color: #92400e;
}

/* Scrollbar */
.dropdown::-webkit-scrollbar {
  width: 6px;
}

.dropdown::-webkit-scrollbar-track {
  background: transparent;
}

.dropdown::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.dropdown::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
