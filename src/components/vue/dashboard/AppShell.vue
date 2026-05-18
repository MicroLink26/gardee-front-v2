<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from '../../../stores/auth';

const auth = useAuthStore();
const props = defineProps<{ requireRole?: 'prestataire' | 'staff' | 'admin' }>();

onMounted(async () => {
  await auth.fetchMe();
  if (!auth.isLoggedIn) {
    window.location.href = '/app/login';
    return;
  }
  if (props.requireRole === 'staff' && !auth.isStaff) {
    window.location.href = '/app/dashboard';
  }
  if (props.requireRole === 'admin' && !auth.isAdmin) {
    window.location.href = '/app/dashboard';
  }
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
        <a href="/"><img src="/logo.svg" alt="Gardee" width="100" height="32" /></a>
      </div>
      <nav class="sidebar-nav">
        <a href="/app/dashboard" class="nav-item">🏠 Tableau de bord</a>
        <a href="/app/profil" class="nav-item">👤 Mon profil</a>
        <template v-if="auth.isPrestataire || auth.isStaff">
          <a href="/app/mes-demandes" class="nav-item">📋 Mes demandes</a>
        </template>
        <template v-else>
          <a href="/app/mes-demandes" class="nav-item">📋 Mes réservations</a>
        </template>
        <template v-if="auth.isStaff">
          <hr class="sidebar-divider" />
          <a href="/app/admin" class="nav-item">⚙️ Admin</a>
          <a href="/app/admin/pending" class="nav-item">⏳ En attente</a>
          <a href="/app/admin/users" class="nav-item">👥 Utilisateurs</a>
          <template v-if="auth.isAdmin">
            <a href="/app/admin/roles" class="nav-item">🔑 Rôles</a>
          </template>
        </template>
      </nav>
      <button class="logout-btn" @click="logout">Déconnexion</button>
    </aside>

    <main class="app-main">
      <div v-if="auth.user" class="app-content">
        <slot />
      </div>
      <div v-else class="loading-screen">Chargement...</div>
    </main>
  </div>
</template>

<style scoped>
.app-shell { display: flex; min-height: 100vh; }
.sidebar {
  width: 240px;
  min-height: 100vh;
  background: #111827;
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  position: sticky;
  top: 0;
}
.sidebar-brand { margin-bottom: 2rem; padding: 0 0.5rem; }
.sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
.nav-item {
  display: block;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  color: #d1d5db;
  text-decoration: none;
  font-size: 0.9rem;
  transition: background 0.15s;
}
.nav-item:hover { background: #1f2937; color: #fff; }
.sidebar-divider { border-color: #374151; margin: 0.75rem 0; }
.logout-btn {
  background: none;
  border: 1.5px solid #374151;
  color: #9ca3af;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  margin-top: 1rem;
}
.logout-btn:hover { border-color: #ef4444; color: #ef4444; }
.app-main { flex: 1; background: #f9fafb; padding: 2rem; }
.loading-screen { display: flex; align-items: center; justify-content: center; height: 100%; color: #6b7280; }
</style>
