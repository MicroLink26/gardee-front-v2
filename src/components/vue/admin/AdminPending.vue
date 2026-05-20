<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../../services/api';
import { getAvatar } from '../../../composables/useAvatar';
import { useCategoryName } from '../../../composables/useCategoryName';
import type { User } from '../../../types';

const { categoryName, categoriesStore } = useCategoryName();

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

onMounted(() => {
  categoriesStore.load();
  load();
});
</script>

<template>
  <div class="admin-pending">
    <div class="page-header">
      <div>
        <h1>Prestataires en attente</h1>
        <p class="header-sub">{{ users.length }} candidature{{ users.length > 1 ? 's' : '' }} à examiner</p>
      </div>
    </div>

    <div v-if="loading" class="skeleton-list">
      <div v-for="i in 3" :key="i" class="skeleton-card">
        <div class="skeleton" style="height:88px;border-radius:14px"></div>
      </div>
    </div>

    <div v-else-if="!users.length" class="empty">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h3>Tout est à jour !</h3>
      <p>Aucun prestataire en attente de validation.</p>
    </div>

    <div v-else class="user-list">
      <div v-for="user in users" :key="user._id" class="user-card">
        <div class="user-photo">
          <img :src="getAvatar(user._id, user.profil_image?.secure_url)" :alt="`${user.prenom} ${user.nom}`" />
        </div>

        <div class="user-info">
          <div class="user-name">{{ user.prenom }} {{ user.nom }}</div>
          <div class="user-meta">
            <span>{{ user.email }}</span>
            <span v-if="user.ville">·</span>
            <span v-if="user.ville">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;vertical-align:-1px"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg>
              {{ user.ville }} ({{ user.codePostal }})
            </span>
          </div>
          <div class="user-tags">
            <span v-for="p in user.prestations.slice(0, 3)" :key="p" class="tag">{{ categoryName(p) }}</span>
            <span v-if="user.tarifHoraire" class="tag tag--price">{{ user.tarifHoraire }} €/h</span>
          </div>
        </div>

        <div class="user-actions">
          <a :href="`/prestataires/?id=${user._id}`" target="_blank" class="btn-view">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Voir
          </a>
          <button class="btn-validate" @click="validate(user._id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Valider
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.admin-pending { display: flex; flex-direction: column; gap: 1.5rem; }

.page-header h1 { font-size: 1.5rem; font-weight: 900; color: #1a1a0e; margin: 0 0 0.25rem; }
.header-sub { font-size: 0.875rem; color: #9ca3af; margin: 0; }

.empty {
  text-align: center; padding: 4rem 2rem;
  display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
}
.empty-icon {
  width: 56px; height: 56px; border-radius: 50%;
  background: #f0ede3; color: #515F37;
  display: flex; align-items: center; justify-content: center;
}
.empty-icon svg { width: 24px; height: 24px; }
.empty h3 { font-size: 1.1rem; font-weight: 700; color: #1a1a0e; margin: 0; }
.empty p { font-size: 0.875rem; color: #9ca3af; margin: 0; }

.user-list { display: flex; flex-direction: column; gap: 0.75rem; }

.user-card {
  display: flex; align-items: center; gap: 1.125rem;
  background: #fff; border: 1.5px solid #e5e2d3; border-radius: 16px; padding: 1.125rem;
  transition: border-color 0.15s;
}
.user-card:hover { border-color: #d6cda4; }

.user-photo {
  width: 52px; height: 52px; border-radius: 50%; overflow: hidden;
  background: #f0ede3; flex-shrink: 0;
}
.user-photo img { width: 100%; height: 100%; object-fit: cover; }
.photo-initials {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 1rem; color: #515F37;
}

.user-info { flex: 1; min-width: 0; }
.user-name { font-size: 0.9rem; font-weight: 700; color: #1a1a0e; }
.user-meta {
  display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;
  font-size: 0.775rem; color: #9ca3af; margin-top: 0.2rem;
}
.user-tags { display: flex; gap: 0.3rem; flex-wrap: wrap; margin-top: 0.4rem; }
.tag {
  background: #f0ede3; color: #515F37;
  border: 1px solid #d6cda4;
  padding: 0.15rem 0.5rem; border-radius: 999px;
  font-size: 0.72rem; font-weight: 600;
}
.tag--price { background: #1a1a0e; color: #d6cda4; border-color: #1a1a0e; }

.user-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }

.btn-view {
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.45rem 0.875rem;
  border: 1.5px solid #e5e2d3; border-radius: 8px;
  text-decoration: none; color: #6b7280;
  font-size: 0.8rem; font-weight: 600;
  transition: all 0.15s;
}
.btn-view svg { width: 13px; height: 13px; }
.btn-view:hover { border-color: #515F37; color: #515F37; }

.btn-validate {
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.45rem 1rem;
  background: #515F37; color: #fff;
  border: none; border-radius: 8px;
  cursor: pointer; font-weight: 700; font-size: 0.8rem;
  transition: background 0.15s;
}
.btn-validate svg { width: 13px; height: 13px; }
.btn-validate:hover { background: #3d4a28; }

.skeleton-list { display: flex; flex-direction: column; gap: 0.75rem; }
.skeleton-card { border-radius: 16px; overflow: hidden; }
.skeleton {
  background: linear-gradient(90deg, #f3f0e8 25%, #ebe8de 50%, #f3f0e8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

@media (max-width: 600px) {
  .user-card { flex-wrap: wrap; }
  .user-actions { width: 100%; justify-content: flex-end; }
}
</style>
