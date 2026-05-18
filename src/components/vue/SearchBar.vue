<script setup lang="ts">
import { ref } from 'vue';

const query = ref('');

function search() {
  if (!query.value.trim()) return;
  window.location.href = `/recherche?q=${encodeURIComponent(query.value.trim())}`;
}
</script>

<template>
  <form class="search-bar" @submit.prevent="search">
    <input
      v-model="query"
      type="search"
      placeholder="Tonte, taille, élagage..."
      class="search-input"
      aria-label="Rechercher un jardinier"
    />
    <button type="submit" class="search-btn">Rechercher</button>
  </form>
</template>

<style scoped>
.search-bar {
  display: flex;
  gap: 0;
  max-width: 560px;
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
}
.search-input {
  flex: 1;
  padding: 1rem 1.25rem;
  font-size: 1rem;
  border: none;
  outline: none;
}
.search-btn {
  padding: 0 1.75rem;
  background: #16a34a;
  color: #fff;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}
.search-btn:hover { background: #15803d; }
</style>
