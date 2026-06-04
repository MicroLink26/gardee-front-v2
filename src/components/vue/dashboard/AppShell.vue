<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import { getAvatar } from '../../../composables/useAvatar';
import { subscribeToPush } from '../../../composables/usePushNotifications';
import { api } from '../../../services/api';

const auth = useAuthStore();
const props = defineProps<{ requireRole?: 'prestataire' | 'staff' | 'admin' }>();

const currentPath = ref('');
const showRejectionPing = ref(false);
const pendingCount = ref(0);
const pendingReviewsCount = ref(0);

function isActive(path: string) {
  return currentPath.value === path || currentPath.value.startsWith(path + '/');
}

onMounted(async () => {
  currentPath.value = window.location.pathname;
  await auth.fetchMe();
  if (!auth.isLoggedIn) {
    window.location.href = '/app/login';
    return;
  }
  if (props.requireRole === 'staff' && !auth.isStaff) window.location.href = '/app/dashboard';
  if (props.requireRole === 'admin' && !auth.isAdmin) window.location.href = '/app/dashboard';
  if (auth.user?.rejectedTemporarily && !auth.user?.rejectionPingShown) {
    showRejectionPing.value = true;
  }
  if (auth.isStaff) {
    api.get('/admin/pending?pageSize=1').then(r => { pendingCount.value = r.data.total ?? 0; }).catch(() => {});
    api.get('/admin/reviews/pending?pageSize=1').then(r => { pendingReviewsCount.value = r.data.total ?? 0; }).catch(() => {});
  }
  subscribeToPush().catch(() => {});
});

async function dismissRejectionPing() {
  showRejectionPing.value = false;
  if (auth.user) {
    await api.post(`/admin/ping-shown/${auth.user._id}`).catch(() => {});
    auth.user.rejectionPingShown = true;
  }
}

async function logout() {
  await auth.logout();
  window.location.href = '/';
}

const userRoleLabel = computed(() => {
  if (!auth.user) return '';
  if (auth.user.role === 'admin') return 'Admin';
  if (auth.user.role === 'staff') return 'Staff';
  if (auth.isPrestataire) return 'Prestataire';
  return 'Client';
});

const userAvatarUrl = computed(() =>
  auth.user ? getAvatar(auth.user._id, auth.user.prestataire?.profil_image?.secure_url) : ''
);
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <a href="/"><img src="/img/logo.png" alt="Gardee" height="36" /></a>
      </div>

      <div v-if="auth.user" class="sidebar-user">
        <div class="user-avatar">
          <img :src="userAvatarUrl" :alt="`${auth.user.prenom} ${auth.user.nom}`" />
        </div>
        <div class="user-info">
          <span class="user-name">{{ auth.user.prenom }} {{ auth.user.nom }}</span>
          <span class="user-role">{{ userRoleLabel }}</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <a href="/app/dashboard" :class="['nav-item', { active: isActive('/app/dashboard') }]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Tableau de bord
        </a>
        <a href="/app/profil" :class="['nav-item', { active: isActive('/app/profil') }]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Mon profil
        </a>
        <a href="/app/mes-demandes" :class="['nav-item', { active: isActive('/app/mes-demandes') }]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6m-6 4h4"/></svg>
          {{ auth.isPrestataire || auth.isStaff ? 'Mes demandes' : 'Mes réservations' }}
        </a>
        <a v-if="auth.isPrestataire" href="/app/messagerie" :class="['nav-item', { active: isActive('/app/messagerie') }]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Messagerie
        </a>

        <template v-if="auth.isStaff">
          <div class="nav-divider">Administration</div>
          <a href="/app/admin" :class="['nav-item', { active: isActive('/app/admin') && !isActive('/app/admin/pending') && !isActive('/app/admin/users') && !isActive('/app/admin/insights') }]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            Dashboard admin
          </a>
          <a href="/app/admin/pending" :class="['nav-item', { active: isActive('/app/admin/pending') }]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            En attente
            <span v-if="pendingCount > 0" class="nav-badge">{{ pendingCount }}</span>
          </a>
          <a href="/app/admin/reviews" :class="['nav-item', { active: isActive('/app/admin/reviews') }]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Avis
            <span v-if="pendingReviewsCount > 0" class="nav-badge">{{ pendingReviewsCount }}</span>
          </a>
          <a href="/app/admin/users" :class="['nav-item', { active: isActive('/app/admin/users') }]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            Utilisateurs
          </a>
          <a href="/app/admin/insights" :class="['nav-item', { active: isActive('/app/admin/insights') }]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Insights
          </a>
        </template>
      </nav>

      <div class="sidebar-footer">
        <a href="/app/parametres" :class="['footer-link', { active: isActive('/app/parametres') }]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          Paramètres
        </a>
        <a href="/" class="footer-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Retour au site
        </a>
        <button class="logout-btn" @click="logout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Déconnexion
        </button>
      </div>
    </aside>

    <!-- Mobile top header -->
    <header class="mobile-header">
      <a href="/" class="mobile-header-logo">
        <img src="/img/logo.png" alt="Gardee" height="32" />
      </a>
      <div v-if="auth.user" class="mobile-header-user">
        <span class="mobile-header-name">{{ auth.user.prenom }}</span>
        <div class="mobile-header-avatar">
          <img :src="userAvatarUrl" :alt="auth.user.prenom" />
        </div>
      </div>
    </header>

    <main class="app-main">
      <div v-if="auth.user" class="app-content">
        <slot />
      </div>
      <div v-else class="loading-screen">
        <div class="sk-page-header">
          <div class="sk-block sk-title"></div>
          <div class="sk-block sk-subtitle"></div>
        </div>
        <div class="sk-stats">
          <div class="sk-block sk-stat" v-for="i in 3" :key="i"></div>
        </div>
        <div class="sk-block sk-card-tall"></div>
        <div class="sk-block sk-card-tall"></div>
      </div>
    </main>

    <!-- Rejection ping modal -->
    <div v-if="showRejectionPing" class="ping-overlay" @click.self="dismissRejectionPing">
      <div class="ping-modal">
        <div class="ping-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h3>Votre profil nécessite des modifications</h3>
        <p>Votre profil prestataire n'est pas encore diffusé. Des corrections sont nécessaires pour qu'il puisse être publié.</p>
        <div v-if="auth.user?.rejectionReason" class="ping-reason">
          <strong>Motif :</strong> {{ auth.user.rejectionReason }}
        </div>
        <p class="ping-sub">Rendez-vous dans <strong>Mon profil</strong> pour effectuer les modifications demandées, puis soumettez votre profil à nouveau.</p>
        <div class="ping-actions">
          <a href="/app/profil" class="ping-btn-primary">Modifier mon profil</a>
          <button class="ping-btn-secondary" @click="dismissRejectionPing">J'ai compris</button>
        </div>
      </div>
    </div>

    <!-- Mobile bottom nav -->
    <nav class="mobile-bottom-nav" v-if="auth.user">
      <a href="/app/dashboard" :class="['mbn-item', { active: isActive('/app/dashboard') }]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        <span>Accueil</span>
      </a>
      <a href="/app/mes-demandes" :class="['mbn-item', { active: isActive('/app/mes-demandes') }]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6m-6 4h4"/></svg>
        <span>Demandes</span>
      </a>
      <a v-if="auth.isPrestataire" href="/app/messagerie" :class="['mbn-item', { active: isActive('/app/messagerie') }]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span>Messages</span>
      </a>
      <a href="/app/profil" :class="['mbn-item', { active: isActive('/app/profil') }]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>Profil</span>
      </a>
      <a v-if="auth.isStaff" href="/app/admin" :class="['mbn-item', { active: isActive('/app/admin') }]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        <span>Admin</span>
      </a>
      <a href="/app/parametres" :class="['mbn-item', { active: isActive('/app/parametres') }]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        <span>Réglages</span>
      </a>
      <button class="mbn-item mbn-logout" @click="logout">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        <span>Sortir</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.app-shell { display: flex; min-height: 100vh; align-items: flex-start; }

/* ── SIDEBAR ── */
.sidebar {
  width: 256px;
  height: 100vh;
  overflow-y: auto;
  background: linear-gradient(180deg, #141f0b 0%, #253515 60%, #2e3f1c 100%);
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  position: sticky;
  top: 0;
  flex-shrink: 0;
}

.sidebar-brand {
  padding: 0.25rem 0.5rem 1.5rem;
  border-bottom: 1px solid rgba(214,205,164,0.2);
  margin-bottom: 1.25rem;
}
.sidebar-brand img { height: 36px; }

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(255,255,255,0.08);
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.user-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}
.user-avatar img { width: 100%; height: 100%; object-fit: cover; }

.user-info { display: flex; flex-direction: column; min-width: 0; }
.user-name { font-size: 0.85rem; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-role { font-size: 0.72rem; color: rgba(214,205,164,0.8); }

.sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; }

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  color: rgba(255,255,255,0.75);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.15s;
}
.nav-item svg { width: 16px; height: 16px; flex-shrink: 0; }
.nav-badge {
  margin-left: auto; background: #dc2626; color: #fff;
  font-size: 0.65rem; font-weight: 800; min-width: 18px; height: 18px;
  border-radius: 999px; display: inline-flex; align-items: center; justify-content: center;
  padding: 0 4px; line-height: 1;
}
.nav-item:hover { background: rgba(168,196,122,0.12); color: #fff; }
.nav-item.active { background: rgba(168,196,122,0.22); color: #a8c47a; font-weight: 700; border-left: 3px solid #a8c47a; padding-left: calc(0.75rem - 3px); }

.nav-divider {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(214,205,164,0.5);
  padding: 1rem 0.75rem 0.4rem;
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(214,205,164,0.2);
  margin-top: 1rem;
}

.footer-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  color: rgba(255,255,255,0.6);
  text-decoration: none;
  font-size: 0.8rem;
  transition: all 0.15s;
}
.footer-link svg { width: 14px; height: 14px; }
.footer-link:hover { color: #fff; background: rgba(255,255,255,0.08); }

.logout-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: none;
  border: none;
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  font-size: 0.8rem;
  border-radius: 8px;
  transition: all 0.15s;
  text-align: left;
  width: 100%;
}
.logout-btn svg { width: 14px; height: 14px; }
.logout-btn:hover { color: #fca5a5; background: rgba(239,68,68,0.1); }

/* ── MAIN ── */
.app-main { flex: 1; background: #faf8f2; min-width: 0; }
.app-content { padding: 2rem; max-width: 1100px; }

.loading-screen {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 680px;
}

.sk-block {
  background: linear-gradient(90deg, #f3f0e8 25%, #ebe8de 50%, #f3f0e8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 10px;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.sk-page-header { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.5rem; }
.sk-title { height: 28px; width: 200px; }
.sk-subtitle { height: 14px; width: 280px; border-radius: 6px; }

.sk-stats { display: flex; gap: 1rem; }
.sk-stat { height: 72px; flex: 1; border-radius: 12px; }

.sk-card-tall { height: 120px; border-radius: 14px; }

/* Mobile top header */
.mobile-header {
  display: none;
}

/* Mobile bottom nav */
.mobile-bottom-nav {
  display: none;
}

@media (max-width: 768px) {
  .sidebar { display: none; }
  .app-content { padding: 1rem 1rem 5rem; }
  .app-main { padding-top: 52px; }

  .mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 52px;
    background: linear-gradient(90deg, #141f0b, #253515);
    padding: 0 1.25rem;
    z-index: 300;
    border-bottom: 1px solid rgba(168,196,122,0.15);
  }

  .mobile-header-logo img { height: 30px; display: block; }

  .mobile-header-user {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .mobile-header-name {
    font-size: 0.82rem;
    font-weight: 600;
    color: rgba(255,255,255,0.85);
  }

  .mobile-header-avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
  }
  .mobile-header-avatar img { width: 100%; height: 100%; object-fit: cover; }

  .mobile-bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(180deg, #253515, #141f0b);
    border-top: 1px solid rgba(168,196,122,0.15);
    z-index: 300;
    padding-bottom: env(safe-area-inset-bottom);
  }

  .mbn-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 0.6rem 0.25rem;
    text-decoration: none;
    color: rgba(255,255,255,0.55);
    font-size: 0.62rem;
    font-weight: 600;
    transition: color 0.15s;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
  }
  .mbn-item svg { width: 20px; height: 20px; }
  .mbn-item.active { color: #a8c47a; }
  .mbn-item:hover { color: rgba(255,255,255,0.85); }
  .mbn-logout { color: rgba(255,255,255,0.45); }
  .mbn-logout:hover { color: #fca5a5; }
}

/* ── REJECTION PING MODAL ── */
.ping-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
}
.ping-modal {
  background: #FCFAF5; border-radius: 20px;
  padding: 2rem; max-width: 480px; width: 100%;
  box-shadow: 0 24px 64px rgba(0,0,0,0.25);
  text-align: center;
}
.ping-icon {
  width: 56px; height: 56px; border-radius: 50%;
  background: #fef3c7; border: 2px solid #fcd34d;
  color: #92400e;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1.25rem;
}
.ping-modal h3 { font-size: 1.1rem; font-weight: 800; color: #1a1a0e; margin: 0 0 0.75rem; }
.ping-modal p { font-size: 0.9rem; color: #6b7280; line-height: 1.6; margin: 0 0 0.75rem; }
.ping-reason {
  background: #f5f2eb; border: 1px solid #e2dece; border-radius: 10px;
  padding: 0.75rem 1rem; font-size: 0.85rem; color: #374151;
  text-align: left; margin-bottom: 0.75rem;
}
.ping-sub { font-size: 0.82rem; color: #9ca3af; margin-bottom: 1.5rem !important; }
.ping-actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
.ping-btn-primary {
  display: inline-flex; align-items: center;
  background: #3a5020; color: #fff; border: none; border-radius: 10px;
  padding: 0.7rem 1.4rem; font-size: 0.875rem; font-weight: 700;
  cursor: pointer; text-decoration: none; transition: background 0.15s; font-family: inherit;
}
.ping-btn-primary:hover { background: #2a3c16; }
.ping-btn-secondary {
  background: none; color: #6b7280; border: 1.5px solid #e2dece; border-radius: 10px;
  padding: 0.7rem 1.4rem; font-size: 0.875rem; font-weight: 600;
  cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.ping-btn-secondary:hover { border-color: #9ca3af; color: #374151; }
</style>
