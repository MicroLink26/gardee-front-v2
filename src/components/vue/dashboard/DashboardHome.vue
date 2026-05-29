<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import { listMyRequests, listMyClientRequests } from '../../../services/requests';

const auth = useAuthStore();
const requests = ref<{ status: string }[]>([]);

const activeCount = computed(() => requests.value.filter(r => ['sent_to_provider', 'client_accepted', 'scheduled'].includes(r.status)).length);
const doneCount = computed(() => requests.value.filter(r => r.status === 'completed').length);

onMounted(async () => {
  try {
    const data = (auth.isPrestataire || auth.isStaff)
      ? await listMyRequests()
      : await listMyClientRequests();
    requests.value = data.items;
  } catch { /* non-bloquant */ }
});
</script>

<template>
  <div class="dashboard">
    <div class="welcome-banner">
      <div class="banner-deco" aria-hidden="true">
        <svg class="bdeco-leaf bdeco-leaf--1" viewBox="0 0 200 320" fill="none"><ellipse cx="100" cy="160" rx="80" ry="140" fill="rgba(168,196,122,0.07)" transform="rotate(-20 100 160)"/><ellipse cx="100" cy="160" rx="50" ry="110" fill="rgba(168,196,122,0.04)" transform="rotate(-20 100 160)"/></svg>
        <svg class="bdeco-leaf bdeco-leaf--2" viewBox="0 0 160 260" fill="none"><ellipse cx="80" cy="130" rx="60" ry="110" fill="rgba(168,196,122,0.06)" transform="rotate(30 80 130)"/></svg>
      </div>
      <div class="welcome-text">
        <span class="welcome-eyebrow">Bienvenue sur Gardee</span>
        <h1>Bonjour, <em>{{ auth.user?.prenom }}</em> 👋</h1>
        <p>Gérez votre activité depuis votre espace personnel.</p>
      </div>
      <img src="/img/arbreBut.svg" alt="" class="welcome-illustration" />
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon stat-icon--blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
        </div>
        <div>
          <div class="stat-val">{{ requests.length }}</div>
          <div class="stat-label">{{ auth.isPrestataire ? 'Demandes reçues' : 'Réservations' }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--orange">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div>
          <div class="stat-val">{{ activeCount }}</div>
          <div class="stat-label">En cours</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div>
          <div class="stat-val">{{ doneCount }}</div>
          <div class="stat-label">Terminées</div>
        </div>
      </div>
    </div>

    <h2 class="section-title">Accès rapides</h2>
    <div class="shortcuts">
      <a href="/app/profil" class="shortcut-card">
        <div class="shortcut-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <span class="shortcut-label">Mon profil</span>
        <span class="shortcut-desc">Modifier mes informations</span>
        <span class="shortcut-arrow">→</span>
      </a>
      <a href="/app/mes-demandes" class="shortcut-card">
        <div class="shortcut-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6m-6 4h4"/></svg>
        </div>
        <span class="shortcut-label">{{ auth.isPrestataire ? 'Mes demandes' : 'Mes réservations' }}</span>
        <span class="shortcut-desc">
          <template v-if="activeCount > 0">
            <span class="badge-count">{{ activeCount }}</span> en cours
          </template>
          <template v-else>Aucune en cours</template>
        </span>
        <span class="shortcut-arrow">→</span>
      </a>
      <a href="/classement" class="shortcut-card">
        <div class="shortcut-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <span class="shortcut-label">Classement</span>
        <span class="shortcut-desc">Voir les meilleurs jardiniers</span>
        <span class="shortcut-arrow">→</span>
      </a>
      <template v-if="auth.isStaff">
        <a href="/app/admin/pending" class="shortcut-card shortcut-card--admin">
          <div class="shortcut-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <span class="shortcut-label">Prestataires en attente</span>
          <span class="shortcut-desc">Valider les nouvelles candidatures</span>
          <span class="shortcut-arrow">→</span>
        </a>
      </template>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.dashboard { display: flex; flex-direction: column; gap: 2rem; }

/* Welcome */
.welcome-banner {
  background: linear-gradient(155deg, #141f0b 0%, #253515 55%, #3a5020 100%);
  border-radius: 20px;
  padding: 2rem 2.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  position: relative;
}
.banner-deco { position: absolute; inset: 0; pointer-events: none; }
.bdeco-leaf { position: absolute; }
.bdeco-leaf--1 { top: -40px; right: 140px; width: 180px; height: 280px; }
.bdeco-leaf--2 { bottom: -30px; right: -20px; width: 140px; height: 220px; }

.welcome-text { position: relative; z-index: 1; }
.welcome-eyebrow {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #a8c47a;
  display: block;
  margin-bottom: 0.5rem;
}
.welcome-banner h1 { font-size: 1.75rem; font-weight: 900; color: #fff; margin: 0 0 0.4rem; letter-spacing: -0.02em; }
.welcome-banner h1 em { font-style: normal; color: #a8c47a; }
.welcome-banner p { color: rgba(255,255,255,0.65); margin: 0; font-size: 0.9rem; }
.welcome-illustration {
  height: 120px;
  opacity: 0.85;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

/* Stats */
.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }

.stat-card {
  background: #FCFAF5;
  border: 1.5px solid #e9e5d6;
  border-radius: 14px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: box-shadow 0.15s, transform 0.15s;
}
.stat-card:hover { box-shadow: 0 4px 16px rgba(58,80,32,0.08); transform: translateY(-2px); }

.stat-icon {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.stat-icon svg { width: 20px; height: 20px; }
.stat-icon--blue { background: #eef2e8; color: #3a5020; }
.stat-icon--orange { background: rgba(230,197,83,0.15); color: #9a7c00; }
.stat-icon--green { background: rgba(168,196,122,0.2); color: #515F37; }

.stat-val { font-size: 1.75rem; font-weight: 900; color: #1a1a0e; line-height: 1; }
.stat-label { font-size: 0.78rem; color: #9ca3af; margin-top: 0.2rem; }

/* Section title */
.section-title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #515F37;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.section-title::after { content: ''; flex: 1; height: 1px; background: #e9e5d6; }

/* Shortcuts */
.shortcuts { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }

.shortcut-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto auto;
  column-gap: 0.875rem;
  row-gap: 0.15rem;
  align-items: center;
  padding: 1.125rem;
  background: #FCFAF5;
  border: 1.5px solid #e9e5d6;
  border-radius: 14px;
  text-decoration: none;
  color: inherit;
  transition: all 0.15s;
}
.shortcut-card:hover {
  border-color: #d6cda4;
  box-shadow: 0 4px 16px rgba(81,95,55,0.08);
  transform: translateY(-2px);
}
.shortcut-card--admin { border-color: #fde68a; }

.shortcut-icon {
  width: 40px; height: 40px;
  background: #f0ede3;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #515F37;
  grid-row: span 2;
}
.shortcut-icon svg { width: 18px; height: 18px; }

.shortcut-label { font-size: 0.875rem; font-weight: 700; color: #1a1a0e; }
.shortcut-desc { font-size: 0.75rem; color: #9ca3af; }
.shortcut-arrow { font-size: 0.875rem; color: #c8c4b4; grid-row: span 2; }
.shortcut-card:hover .shortcut-arrow { color: #515F37; }

.badge-count {
  display: inline-flex; align-items: center; justify-content: center;
  background: #515F37; color: #fff;
  font-size: 0.68rem; font-weight: 700;
  width: 18px; height: 18px; border-radius: 50%;
  vertical-align: middle;
}

@media (max-width: 640px) {
  .welcome-illustration { display: none; }
  .stats-row { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 420px) {
  .stats-row { grid-template-columns: 1fr; }
}
</style>
