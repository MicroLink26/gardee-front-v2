<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from '../../../stores/auth';

const auth = useAuthStore();
const props = defineProps<{ requireRole?: 'prestataire' | 'staff' | 'admin' }>();

const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

function isActive(path: string) {
  return currentPath === path || currentPath.startsWith(path + '/');
}

onMounted(async () => {
  await auth.fetchMe();
  if (!auth.isLoggedIn) {
    window.location.href = '/app/login';
    return;
  }
  if (props.requireRole === 'staff' && !auth.isStaff) window.location.href = '/app/dashboard';
  if (props.requireRole === 'admin' && !auth.isAdmin) window.location.href = '/app/dashboard';
});

async function logout() {
  await auth.logout();
  window.location.href = '/';
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <a href="/"><img src="/logo.png" alt="Gardee" height="36" /></a>
      </div>

      <div v-if="auth.user" class="sidebar-user">
        <div class="user-avatar">{{ auth.user.prenom?.[0] }}{{ auth.user.nom?.[0] }}</div>
        <div class="user-info">
          <span class="user-name">{{ auth.user.prenom }} {{ auth.user.nom }}</span>
          <span class="user-role">{{ auth.isPrestataire ? 'Prestataire' : auth.isStaff ? 'Staff' : 'Client' }}</span>
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

        <template v-if="auth.isStaff">
          <div class="nav-divider">Administration</div>
          <a href="/app/admin" :class="['nav-item', { active: isActive('/app/admin') && !isActive('/app/admin/pending') && !isActive('/app/admin/users') }]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            Dashboard admin
          </a>
          <a href="/app/admin/pending" :class="['nav-item', { active: isActive('/app/admin/pending') }]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            En attente
          </a>
          <a href="/app/admin/users" :class="['nav-item', { active: isActive('/app/admin/users') }]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            Utilisateurs
          </a>
        </template>
      </nav>

      <div class="sidebar-footer">
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

    <main class="app-main">
      <div v-if="auth.user" class="app-content">
        <slot />
      </div>
      <div v-else class="loading-screen">
        <div class="loading-spinner"></div>
        <span>Chargement...</span>
      </div>
    </main>

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
      <a href="/app/profil" :class="['mbn-item', { active: isActive('/app/profil') }]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>Profil</span>
      </a>
      <a v-if="auth.isStaff" href="/app/admin" :class="['mbn-item', { active: isActive('/app/admin') }]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        <span>Admin</span>
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

.app-shell { display: flex; min-height: 100vh; }

/* ── SIDEBAR ── */
.sidebar {
  width: 256px;
  min-height: 100vh;
  background: #515F37;
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
  background: #d6cda4;
  color: #515F37;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 0.85rem;
  flex-shrink: 0;
}

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
.nav-item:hover { background: rgba(255,255,255,0.1); color: #fff; }
.nav-item.active { background: #d6cda4; color: #1a1a0e; font-weight: 700; }

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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 0.75rem;
  color: #9ca3af;
  font-size: 0.875rem;
}

.loading-spinner {
  width: 28px; height: 28px;
  border: 3px solid #e5e2d3;
  border-top-color: #515F37;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Mobile bottom nav */
.mobile-bottom-nav {
  display: none;
}

@media (max-width: 768px) {
  .sidebar { display: none; }
  .app-content { padding: 1rem 1rem 5rem; }

  .mobile-bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #515F37;
    border-top: 1px solid rgba(214,205,164,0.25);
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
  .mbn-item.active { color: #d6cda4; }
  .mbn-item:hover { color: rgba(255,255,255,0.85); }
  .mbn-logout { color: rgba(255,255,255,0.45); }
  .mbn-logout:hover { color: #fca5a5; }
}
</style>
