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
  <div class="admin-home">
    <div class="page-header">
      <p class="header-eyebrow">Espace staff</p>
      <h1>Administration</h1>
      <p class="header-sub">Vue d'ensemble de la plateforme Gardee</p>
    </div>

    <div class="stats-grid">
      <a href="/app/admin/pending" class="stat-card stat-card--alert">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div class="stat-body">
          <div class="stat-value">{{ stats?.pending ?? '…' }}</div>
          <div class="stat-label">En attente de validation</div>
        </div>
        <svg class="stat-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>

      <a href="/app/admin/users" class="stat-card">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
        </div>
        <div class="stat-body">
          <div class="stat-value">{{ stats?.total ?? '…' }}</div>
          <div class="stat-label">Utilisateurs inscrits</div>
        </div>
        <svg class="stat-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>
    </div>

    <h2 class="section-title">Actions rapides</h2>
    <div class="actions-grid">
      <a href="/app/admin/pending" class="action-card">
        <div class="action-icon action-icon--orange">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <div>
          <div class="action-label">Valider des prestataires</div>
          <div class="action-desc">Examiner les candidatures en attente</div>
        </div>
        <span class="action-arrow">→</span>
      </a>
      <a href="/app/admin/users" class="action-card">
        <div class="action-icon action-icon--blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </div>
        <div>
          <div class="action-label">Gérer les utilisateurs</div>
          <div class="action-desc">Modifier les rôles et les comptes</div>
        </div>
        <span class="action-arrow">→</span>
      </a>
      <a href="/classement" target="_blank" class="action-card">
        <div class="action-icon action-icon--green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <div>
          <div class="action-label">Voir le classement public</div>
          <div class="action-desc">Page visible par les visiteurs</div>
        </div>
        <span class="action-arrow">↗</span>
      </a>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.admin-home { display: flex; flex-direction: column; gap: 1.75rem; }

.page-header { padding-bottom: 1.5rem; border-bottom: 1px solid #e9e5d6; }
.header-eyebrow { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #a8c47a; margin: 0 0 0.35rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 900; color: #1a1a0e; margin: 0 0 0.2rem; letter-spacing: -0.02em; }
.header-sub { font-size: 0.85rem; color: #9ca3af; margin: 0; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }

.stat-card {
  display: flex; align-items: center; gap: 1rem;
  background: #FCFAF5; border: 1.5px solid #e9e5d6; border-radius: 16px; padding: 1.25rem;
  text-decoration: none; color: inherit; transition: all 0.15s;
}
.stat-card:hover {
  border-color: #c8d9a6;
  box-shadow: 0 4px 16px rgba(58,80,32,0.08);
  transform: translateY(-2px);
}
.stat-card--alert { border-color: rgba(230,197,83,0.4); background: rgba(230,197,83,0.05); }
.stat-card--alert:hover { border-color: rgba(230,197,83,0.7); }

.stat-icon {
  width: 48px; height: 48px; border-radius: 12px;
  background: #eef2e8; color: #3a5020;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.stat-icon svg { width: 22px; height: 22px; }
.stat-card--alert .stat-icon { background: rgba(230,197,83,0.18); color: #7a6000; }

.stat-body { flex: 1; }
.stat-value { font-size: 2rem; font-weight: 900; color: #1a1a0e; line-height: 1; }
.stat-label { font-size: 0.8rem; color: #9ca3af; margin-top: 0.2rem; }

.stat-arrow { width: 18px; height: 18px; color: #c8c4b4; flex-shrink: 0; }
.stat-card:hover .stat-arrow { color: #515F37; }

.section-title {
  font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: #515F37; margin: 0;
  display: flex; align-items: center; gap: 0.75rem;
}
.section-title::after { content: ''; flex: 1; height: 1px; background: #e9e5d6; }

.actions-grid { display: flex; flex-direction: column; gap: 0.6rem; }

.action-card {
  display: flex; align-items: center; gap: 1rem;
  background: #FCFAF5; border: 1.5px solid #e9e5d6; border-radius: 14px; padding: 1rem 1.25rem;
  text-decoration: none; color: inherit; transition: all 0.15s;
}
.action-card:hover { border-color: #c8d9a6; box-shadow: 0 4px 16px rgba(58,80,32,0.07); }

.action-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.action-icon svg { width: 18px; height: 18px; }
.action-icon--green { background: rgba(168,196,122,0.18); color: #3a5020; }
.action-icon--orange { background: rgba(230,197,83,0.15); color: #7a6000; }
.action-icon--blue { background: #eef2e8; color: #515F37; }

.action-label { font-size: 0.875rem; font-weight: 700; color: #1a1a0e; }
.action-desc { font-size: 0.775rem; color: #9ca3af; margin-top: 0.1rem; }
.action-arrow { font-size: 0.875rem; color: #c8c4b4; margin-left: auto; transition: color 0.15s; }
.action-card:hover .action-arrow { color: #515F37; }
</style>
