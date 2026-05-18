<script setup lang="ts">
import { useAuthStore } from '../../../stores/auth';
const auth = useAuthStore();
</script>

<template>
  <div>
    <h2>Bonjour, {{ auth.user?.prenom }} 👋</h2>
    <p class="subtitle">Bienvenue dans votre espace Gardee.</p>

    <div class="shortcuts">
      <a href="/app/profil" class="shortcut-card">
        <span class="shortcut-icon">👤</span>
        <span>Mon profil</span>
      </a>
      <a href="/app/mes-demandes" class="shortcut-card">
        <span class="shortcut-icon">📋</span>
        <span>{{ auth.isPrestataire ? 'Mes demandes' : 'Mes réservations' }}</span>
      </a>
      <a v-if="auth.isStaff" href="/app/admin/pending" class="shortcut-card">
        <span class="shortcut-icon">⏳</span>
        <span>Prestataires en attente</span>
      </a>
    </div>
  </div>
</template>

<style scoped>
h2 { font-size: 1.75rem; font-weight: 800; margin-bottom: 0.35rem; }
.subtitle { color: #6b7280; margin-bottom: 2rem; }
.shortcuts { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
.shortcut-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  text-decoration: none;
  color: #111827;
  font-weight: 600;
  font-size: 0.9rem;
  transition: box-shadow 0.15s, transform 0.15s;
}
.shortcut-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-2px); }
.shortcut-icon { font-size: 2rem; }
</style>
