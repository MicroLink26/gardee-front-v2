<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../../services/api';
import type { User, UserRole } from '../../../types';

const users = ref<User[]>([]);
const total = ref(0);
const page = ref(1);
const q = ref('');
const loading = ref(false);
const PAGE_SIZE = 20;

async function load() {
  loading.value = true;
  const { data } = await api.get('/admin/users', { params: { q: q.value || undefined, page: page.value, pageSize: PAGE_SIZE } });
  users.value = data.items;
  total.value = data.total;
  loading.value = false;
}

async function changeRole(id: string, role: UserRole) {
  await api.patch(`/admin/roles/${id}`, { role });
  load();
}

async function deleteUser(id: string, name: string) {
  if (!confirm(`Supprimer ${name} ? Cette action est irréversible.`)) return;
  await api.delete(`/admin/users/${id}`);
  load();
}

onMounted(load);

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'client', label: 'Client' },
  { value: 'prestataire', label: 'Prestataire' },
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Admin' },
];

const totalPages = () => Math.ceil(total.value / PAGE_SIZE);
</script>

<template>
  <div>
    <h2>Gestion des utilisateurs ({{ total }})</h2>

    <div class="toolbar">
      <input v-model="q" type="search" placeholder="Rechercher..." @keyup.enter="page = 1; load()" />
      <button @click="page = 1; load()">Rechercher</button>
    </div>

    <div v-if="loading" class="loading">Chargement...</div>
    <table v-else class="table">
      <thead>
        <tr>
          <th>Nom</th>
          <th>Email</th>
          <th>Ville</th>
          <th>Rôle</th>
          <th>Validé</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u._id">
          <td>{{ u.prenom }} {{ u.nom }}</td>
          <td>{{ u.email }}</td>
          <td>{{ u.ville ?? '—' }}</td>
          <td>
            <select :value="u.role" @change="changeRole(u._id, ($event.target as HTMLSelectElement).value as UserRole)" class="role-select">
              <option v-for="r in ROLES" :key="r.value" :value="r.value">{{ r.label }}</option>
            </select>
          </td>
          <td>
            <span :class="u.is_validated ? 'badge-green' : 'badge-yellow'">
              {{ u.is_validated ? '✓' : '⏳' }}
            </span>
          </td>
          <td>
            <a :href="`/prestataires/${u._id}`" target="_blank" class="action-link">Voir</a>
            <button class="action-delete" @click="deleteUser(u._id, `${u.prenom} ${u.nom}`)">Suppr.</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="totalPages() > 1" class="pagination">
      <button :disabled="page === 1" @click="page--; load()">‹</button>
      <span>{{ page }} / {{ totalPages() }}</span>
      <button :disabled="page === totalPages()" @click="page++; load()">›</button>
    </div>
  </div>
</template>

<style scoped>
h2 { margin-bottom: 1.25rem; }
.toolbar { display: flex; gap: 0.75rem; margin-bottom: 1.25rem; }
.toolbar input { flex: 1; padding: 0.55rem 0.875rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; }
.toolbar button { padding: 0.55rem 1.25rem; background: #16a34a; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
.table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; font-size: 0.875rem; }
th { background: #f9fafb; padding: 0.75rem 1rem; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; }
td { padding: 0.75rem 1rem; border-bottom: 1px solid #f3f4f6; color: #111827; }
tr:hover td { background: #f9fafb; }
.role-select { padding: 0.3rem 0.5rem; border: 1.5px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; }
.badge-green { background: #dcfce7; color: #16a34a; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
.badge-yellow { background: #fef9c3; color: #ca8a04; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
.action-link { color: #16a34a; text-decoration: none; margin-right: 0.75rem; font-weight: 500; }
.action-delete { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.85rem; font-weight: 500; }
.action-delete:hover { text-decoration: underline; }
.loading { color: #6b7280; padding: 2rem; text-align: center; }
.pagination { display: flex; gap: 0.75rem; align-items: center; justify-content: center; margin-top: 1.25rem; }
.pagination button { padding: 0.4rem 0.875rem; border: 1.5px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; }
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
