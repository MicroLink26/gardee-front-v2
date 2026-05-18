<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../../services/api';

interface Stats { pending: number; total: number }
const stats = ref<Stats | null>(null);

onMounted(async () => {
  const [pending, all] = await Promise.all([
    api.get('/admin/pending?pageSize=1'),
    api.get('/admin/users?pageSize=1'),
  ]);
  stats.value = { pending: pending.data.total, total: all.data.total };
});
</script>

<template>
  <div>
    <h2>Administration</h2>
    <div class="stats-grid">
      <a href="/app/admin/pending" class="stat-card">
        <span class="stat-icon">⏳</span>
        <div>
          <p class="stat-value">{{ stats?.pending ?? '…' }}</p>
          <p class="stat-label">Prestataires en attente</p>
        </div>
      </a>
      <a href="/app/admin/users" class="stat-card">
        <span class="stat-icon">👥</span>
        <div>
          <p class="stat-value">{{ stats?.total ?? '…' }}</p>
          <p class="stat-label">Utilisateurs au total</p>
        </div>
      </a>
    </div>
    <div class="quick-links">
      <a href="/app/admin/pending" class="quick-link">Valider des prestataires →</a>
      <a href="/app/admin/users" class="quick-link">Gérer les utilisateurs →</a>
    </div>
  </div>
</template>

<style scoped>
h2 { margin-bottom: 1.5rem; font-size: 1.5rem; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.stat-card { display: flex; align-items: center; gap: 1rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem; text-decoration: none; color: inherit; transition: box-shadow 0.15s; }
.stat-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.stat-icon { font-size: 2rem; }
.stat-value { font-size: 1.75rem; font-weight: 800; color: #111827; }
.stat-label { font-size: 0.875rem; color: #6b7280; }
.quick-links { display: flex; flex-direction: column; gap: 0.5rem; }
.quick-link { color: #16a34a; text-decoration: none; font-weight: 500; font-size: 0.95rem; }
.quick-link:hover { text-decoration: underline; }
</style>
