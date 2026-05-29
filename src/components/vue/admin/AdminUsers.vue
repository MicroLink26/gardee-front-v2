<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { api } from '../../../services/api';
import type { User, UserRole } from '../../../types';

const users = ref<User[]>([]);
const total = ref(0);
const page = ref(1);
const q = ref('');
const loading = ref(false);
const PAGE_SIZE = 20;

const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE));

async function load() {
  loading.value = true;
  const { data } = await api.get('/admin/users', { params: { q: q.value || undefined, page: page.value, pageSize: PAGE_SIZE } });
  users.value = data.items;
  total.value = data.total;
  loading.value = false;
}

function search() { page.value = 1; load(); }

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

function roleClass(role: string) {
  if (role === 'admin') return 'role-admin';
  if (role === 'staff') return 'role-staff';
  if (role === 'prestataire') return 'role-prest';
  return 'role-client';
}
</script>

<template>
  <div class="admin-users">
    <div class="page-header">
      <div>
        <p class="header-eyebrow">Administration</p>
        <h1>Utilisateurs</h1>
        <p class="header-sub">{{ total }} compte{{ total > 1 ? 's' : '' }} inscrits</p>
      </div>
    </div>

    <div class="toolbar">
      <div class="search-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input v-model="q" type="search" placeholder="Nom, email, ville..." @keyup.enter="search" />
      </div>
      <button class="btn-search" @click="search">Rechercher</button>
    </div>

    <div v-if="loading" class="skeleton-list">
      <div v-for="i in 5" :key="i" class="skeleton" style="height:60px;border-radius:12px"></div>
    </div>

    <div v-else class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Ville</th>
            <th>Rôle</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u._id">
            <td>
              <div class="user-cell">
                <div class="user-avatar">{{ u.prenom?.[0] }}{{ u.nom?.[0] }}</div>
                <div>
                  <div class="user-name">{{ u.prenom }} {{ u.nom }}</div>
                  <div class="user-email">{{ u.email }}</div>
                </div>
              </div>
            </td>
            <td class="td-muted">{{ u.ville ?? '—' }}</td>
            <td>
              <select
                :value="u.role"
                @change="changeRole(u._id, ($event.target as HTMLSelectElement).value as UserRole)"
                :class="['role-select', roleClass(u.role)]"
              >
                <option v-for="r in ROLES" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
            </td>
            <td>
              <span :class="['status-badge', u.is_validated ? 'badge-green' : 'badge-yellow']">
                {{ u.is_validated ? 'Validé' : 'En attente' }}
              </span>
            </td>
            <td>
              <div class="action-btns">
                <a :href="`/prestataires/${u._id}/`" target="_blank" class="btn-view">Voir</a>
                <button class="btn-delete" @click="deleteUser(u._id, `${u.prenom} ${u.nom}`)">Suppr.</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="page === 1" @click="page--; load()">← Précédent</button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <button class="page-btn" :disabled="page === totalPages" @click="page++; load()">Suivant →</button>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.admin-users { display: flex; flex-direction: column; gap: 1.5rem; }

.page-header { padding-bottom: 1.5rem; border-bottom: 1px solid #e9e5d6; }
.header-eyebrow { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #a8c47a; margin: 0 0 0.35rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 900; color: #1a1a0e; margin: 0 0 0.2rem; letter-spacing: -0.02em; }
.header-sub { font-size: 0.85rem; color: #9ca3af; margin: 0; }

.toolbar { display: flex; gap: 0.75rem; }

.search-wrap {
  flex: 1; position: relative;
  max-width: 400px;
}
.search-icon {
  position: absolute; left: 0.875rem; top: 50%;
  transform: translateY(-50%);
  width: 15px; height: 15px; color: #9ca3af; pointer-events: none;
}
.search-wrap input {
  width: 100%;
  padding: 0.6rem 0.875rem 0.6rem 2.4rem;
  border: 1.5px solid #e9e5d6; border-radius: 10px;
  font-size: 0.875rem; background: #f5f2eb; color: #1a1a0e;
  font-family: inherit; transition: border-color 0.15s, background 0.15s;
}
.search-wrap input:focus { outline: none; border-color: #515F37; background: #FCFAF5; }

.btn-search {
  padding: 0.6rem 1.25rem;
  background: #3a5020; color: #fff;
  border: none; border-radius: 10px;
  font-weight: 700; font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer; transition: background 0.15s, transform 0.15s;
}
.btn-search:hover { background: #253515; transform: translateY(-1px); }

.table-wrap {
  background: #FCFAF5; border: 1.5px solid #e9e5d6;
  border-radius: 16px; overflow: hidden;
}

.table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
th {
  background: #faf8f2; padding: 0.75rem 1rem;
  text-align: left; font-size: 0.68rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: #515F37; border-bottom: 1px solid #e9e5d6;
}
td { padding: 0.875rem 1rem; border-bottom: 1px solid #f0ede3; vertical-align: middle; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: #faf8f2; }

.user-cell { display: flex; align-items: center; gap: 0.75rem; }
.user-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: #f0ede3; color: #515F37;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 0.78rem; flex-shrink: 0;
}
.user-name { font-weight: 700; color: #1a1a0e; }
.user-email { font-size: 0.75rem; color: #9ca3af; margin-top: 0.1rem; }
.td-muted { color: #9ca3af; font-size: 0.8rem; }

.role-select {
  padding: 0.3rem 0.6rem; border-radius: 6px;
  font-size: 0.8rem; font-weight: 600; cursor: pointer;
  border: 1.5px solid #e9e5d6; background: #f5f2eb;
  font-family: inherit; transition: border-color 0.15s;
}
.role-select:focus { outline: none; border-color: #515F37; }
.role-admin { border-color: #a78bfa; color: #7c3aed; background: #f5f3ff; }
.role-staff { border-color: #93c5fd; color: #2563eb; background: #eff6ff; }
.role-prest { border-color: rgba(168,196,122,0.4); color: #3a5020; background: rgba(168,196,122,0.1); }
.role-client { border-color: #e9e5d6; color: #6b7280; background: #f5f2eb; }

.status-badge {
  padding: 0.2rem 0.65rem; border-radius: 999px;
  font-size: 0.72rem; font-weight: 700;
}
.badge-green { background: rgba(168,196,122,0.15); color: #3a5020; border: 1px solid rgba(168,196,122,0.3); }
.badge-yellow { background: rgba(230,197,83,0.15); color: #7a6000; border: 1px solid rgba(230,197,83,0.35); }

.action-btns { display: flex; gap: 0.5rem; align-items: center; }
.btn-view {
  padding: 0.3rem 0.75rem; border: 1.5px solid #e9e5d6; border-radius: 6px;
  text-decoration: none; color: #515F37; font-size: 0.78rem; font-weight: 600;
  background: #f5f2eb; transition: all 0.15s;
}
.btn-view:hover { border-color: #a8c47a; background: #eef2e8; }
.btn-delete {
  background: none; border: none; color: #fca5a5;
  cursor: pointer; font-size: 0.78rem; font-weight: 600;
  font-family: inherit; transition: color 0.15s;
}
.btn-delete:hover { color: #b91c1c; }

.pagination {
  display: flex; align-items: center; justify-content: center; gap: 1rem;
}
.page-btn {
  padding: 0.5rem 1.1rem; border: 1.5px solid #e9e5d6; border-radius: 10px;
  background: #FCFAF5; color: #515F37; font-weight: 600; font-size: 0.875rem;
  font-family: inherit; cursor: pointer; transition: all 0.15s;
}
.page-btn:hover:not(:disabled) { background: #eef2e8; border-color: #a8c47a; }
.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.page-info { font-size: 0.875rem; color: #9ca3af; }

.skeleton-list { display: flex; flex-direction: column; gap: 0.5rem; }
.skeleton {
  background: linear-gradient(90deg, #f3f0e8 25%, #ebe8de 50%, #f3f0e8 75%);
  background-size: 200% 100%; animation: shimmer 1.4s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

@media (max-width: 768px) {
  .toolbar { flex-wrap: wrap; }
  .search-wrap { max-width: 100%; }
  .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .table { min-width: 560px; }
}
</style>
