<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../../services/api';
import type { User } from '../../../types';

const users = ref<User[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  const { data } = await api.get('/admin/pending?pageSize=50');
  users.value = data.items;
  loading.value = false;
}

async function validate(id: string) {
  await api.post(`/admin/validate/${id}`);
  users.value = users.value.filter(u => u._id !== id);
}

onMounted(load);
</script>

<template>
  <div>
    <h2>Prestataires en attente de validation ({{ users.length }})</h2>
    <div v-if="loading" class="loading">Chargement...</div>
    <p v-else-if="!users.length" class="empty">Aucun prestataire en attente.</p>
    <div v-else class="user-list">
      <div v-for="user in users" :key="user._id" class="user-card">
        <div class="user-photo">
          <img v-if="user.profil_image?.secure_url" :src="user.profil_image.secure_url" :alt="`${user.prenom} ${user.nom}`" />
          <div v-else class="photo-placeholder">{{ user.prenom[0] }}{{ user.nom[0] }}</div>
        </div>
        <div class="user-info">
          <p class="user-name">{{ user.prenom }} {{ user.nom }}</p>
          <p class="user-meta">{{ user.email }} · {{ user.ville }} ({{ user.codePostal }})</p>
          <p class="user-prestations">{{ user.prestations.join(', ') }}</p>
          <p v-if="user.tarifHoraire" class="user-tarif">{{ user.tarifHoraire }} €/h</p>
        </div>
        <div class="user-actions">
          <a :href="`/prestataires/${user._id}`" target="_blank" class="btn-view">Voir</a>
          <button class="btn-validate" @click="validate(user._id)">✓ Valider</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
h2 { margin-bottom: 1.5rem; }
.loading, .empty { color: #6b7280; }
.user-list { display: flex; flex-direction: column; gap: 1rem; }
.user-card { display: flex; align-items: center; gap: 1.25rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem; }
.user-photo { width: 56px; height: 56px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
.user-photo img { width: 100%; height: 100%; object-fit: cover; }
.photo-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f3f4f6; font-weight: 700; color: #9ca3af; }
.user-info { flex: 1; }
.user-name { font-weight: 700; margin: 0 0 0.2rem; }
.user-meta { color: #6b7280; font-size: 0.85rem; margin: 0; }
.user-prestations { font-size: 0.85rem; color: #374151; margin: 0.25rem 0 0; }
.user-tarif { font-weight: 600; font-size: 0.9rem; margin: 0.25rem 0 0; color: #16a34a; }
.user-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
.btn-view { padding: 0.45rem 1rem; border: 1.5px solid #d1d5db; border-radius: 8px; text-decoration: none; color: #374151; font-size: 0.875rem; }
.btn-validate { padding: 0.45rem 1.25rem; background: #16a34a; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.875rem; }
.btn-validate:hover { background: #15803d; }
</style>
