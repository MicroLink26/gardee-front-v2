<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getRanking } from '../../services/users';
import type { User } from '../../types';
import PrestataireCard from './PrestataireCard.vue';

const users = ref<User[]>([]);
const total = ref(0);
const page = ref(1);
const prestation = ref('');
const ville = ref('');
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    const data = await getRanking({ prestation: prestation.value || undefined, ville: ville.value || undefined, page: page.value });
    users.value = data.items;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="classement">
    <div class="classement-header">
      <h1>Classement des prestataires</h1>
      <p>Les jardiniers les mieux notés par nos clients</p>
    </div>

    <div class="filters">
      <input v-model="prestation" type="text" placeholder="Service (tonte, taille...)" @keyup.enter="page = 1; load()" />
      <input v-model="ville" type="text" placeholder="Ville" @keyup.enter="page = 1; load()" />
      <button @click="page = 1; load()">Filtrer</button>
    </div>

    <div v-if="loading" class="loading">Chargement...</div>
    <template v-else>
      <p class="result-count">{{ total }} prestataire{{ total > 1 ? 's' : '' }}</p>
      <div class="grid">
        <PrestataireCard v-for="u in users" :key="u._id" :user="u" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.classement { max-width: 1100px; margin: 0 auto; padding: 2rem; }
.classement-header { margin-bottom: 2rem; }
h1 { font-size: 2rem; font-weight: 800; }
.classement-header p { color: #6b7280; margin-top: 0.35rem; }
.filters { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.filters input { padding: 0.6rem 1rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; flex: 1; min-width: 160px; }
.filters button { padding: 0.6rem 1.5rem; background: #16a34a; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
.result-count { color: #6b7280; margin-bottom: 1rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.5rem; }
.loading { text-align: center; padding: 3rem; color: #6b7280; }
</style>
