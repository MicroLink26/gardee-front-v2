<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import { api } from '../../../services/api';
import NotificationPreferences from '../settings/NotificationPreferences.vue';

const auth = useAuthStore();

const deleteProfileLoading = ref(false);
const deleteProfileConfirm = ref(false);
const deleteAccountLoading = ref(false);
const deleteAccountConfirm = ref(false);
const error = ref('');

async function deleteProfile() {
  if (!deleteProfileConfirm.value) { deleteProfileConfirm.value = true; return; }
  deleteProfileLoading.value = true;
  error.value = '';
  try {
    await api.delete('/prestataires/me');
    if (auth.user) auth.user.isPrestataire = false;
    deleteProfileConfirm.value = false;
    window.location.href = '/app/dashboard';
  } catch {
    error.value = 'Une erreur est survenue. Veuillez réessayer dans un instant.';
  } finally {
    deleteProfileLoading.value = false;
  }
}

async function deleteAccount() {
  if (!deleteAccountConfirm.value) { deleteAccountConfirm.value = true; return; }
  deleteAccountLoading.value = true;
  error.value = '';
  try {
    if (!auth.user) return;
    await api.delete(`/admin/users/${auth.user._id}`);
    await auth.logout();
    window.location.href = '/';
  } catch {
    error.value = 'Une erreur est survenue. Veuillez réessayer dans un instant.';
  } finally {
    deleteAccountLoading.value = false;
  }
}
</script>

<template>
  <div class="parametres">
    <div class="page-header">
      <h1>Paramètres</h1>
      <p class="header-sub">Gérez votre compte et vos préférences</p>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <!-- Notifications -->
    <div class="settings-card">
      <NotificationPreferences />
    </div>

    <!-- Profil prestataire -->
    <div v-if="auth.isPrestataire" class="settings-card danger-zone">
      <div class="settings-card-header">
        <h2>Profil prestataire</h2>
        <p>Supprimer votre profil de prestataire retire votre fiche de la plateforme. Votre compte client reste actif.</p>
      </div>
      <div v-if="deleteProfileConfirm" class="confirm-box">
        <p>Êtes-vous sûr de vouloir supprimer votre profil prestataire ? Cette action est irréversible.</p>
        <div class="confirm-actions">
          <button class="btn-cancel" @click="deleteProfileConfirm = false">Annuler</button>
          <button class="btn-danger" :disabled="deleteProfileLoading" @click="deleteProfile">
            {{ deleteProfileLoading ? 'Suppression…' : 'Confirmer la suppression' }}
          </button>
        </div>
      </div>
      <button v-else class="btn-danger-outline" @click="deleteProfile">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
        Supprimer mon profil prestataire
      </button>
    </div>

    <!-- Compte -->
    <div class="settings-card danger-zone">
      <div class="settings-card-header">
        <h2>Supprimer le compte</h2>
        <p>La suppression de votre compte est définitive. Toutes vos données seront effacées.</p>
      </div>
      <div v-if="deleteAccountConfirm" class="confirm-box">
        <p>Cette action est <strong>irréversible</strong>. Votre compte, votre profil prestataire et toutes vos données seront définitivement supprimés.</p>
        <div class="confirm-actions">
          <button class="btn-cancel" @click="deleteAccountConfirm = false">Annuler</button>
          <button class="btn-danger" :disabled="deleteAccountLoading" @click="deleteAccount">
            {{ deleteAccountLoading ? 'Suppression…' : 'Supprimer définitivement' }}
          </button>
        </div>
      </div>
      <button v-else class="btn-danger-outline" @click="deleteAccount">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
        Supprimer mon compte
      </button>
    </div>

    <!-- Légal -->
    <div class="settings-card">
      <div class="settings-card-header">
        <h2>Informations légales</h2>
      </div>
      <div class="legal-links">
        <a href="/cgu" class="legal-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Conditions générales d'utilisation
        </a>
        <a href="/confidentialite" class="legal-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Politique de confidentialité
        </a>
        <a href="/mentions-legales" class="legal-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Mentions légales
        </a>
        <a href="/contact" class="legal-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          Nous contacter
        </a>
      </div>
    </div>

  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.parametres { display: flex; flex-direction: column; gap: 1.5rem; }

.page-header { padding-bottom: 1.5rem; border-bottom: 1px solid #e9e5d6; }
.page-header h1 { font-size: 1.5rem; font-weight: 900; color: #1a1a0e; margin: 0 0 0.2rem; }
.header-sub { font-size: 0.85rem; color: #9ca3af; margin: 0; }

.error-msg { color: #dc2626; font-size: 0.85rem; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 0.75rem 1rem; }

.settings-card {
  background: #FCFAF5; border: 1.5px solid #e9e5d6; border-radius: 16px;
  padding: 1.375rem;
}
.settings-card.danger-zone { border-color: #fecaca; }

.settings-card-header { margin-bottom: 1rem; }
.settings-card-header h2 { font-size: 1rem; font-weight: 800; color: #1a1a0e; margin: 0 0 0.3rem; }
.settings-card-header p { font-size: 0.85rem; color: #6b7280; margin: 0; line-height: 1.5; }

.btn-danger-outline {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.6rem 1.25rem;
  background: none; color: #dc2626;
  border: 1.5px solid #fca5a5; border-radius: 10px;
  font-size: 0.875rem; font-weight: 600; cursor: pointer; font-family: inherit;
  transition: all 0.15s;
}
.btn-danger-outline:hover { background: #fee2e2; border-color: #f87171; }

.confirm-box {
  background: #fff8f8; border: 1px solid #fecaca; border-radius: 10px;
  padding: 1rem; font-size: 0.875rem; color: #374151;
}
.confirm-box p { margin: 0 0 1rem; line-height: 1.6; }
.confirm-actions { display: flex; gap: 0.75rem; }
.btn-cancel {
  padding: 0.6rem 1.25rem; background: none; color: #6b7280;
  border: 1.5px solid #e9e5d6; border-radius: 10px;
  font-size: 0.875rem; font-weight: 600; cursor: pointer; font-family: inherit;
  transition: all 0.15s;
}
.btn-cancel:hover { border-color: #9ca3af; color: #374151; }
.btn-danger {
  padding: 0.6rem 1.25rem; background: #dc2626; color: #fff;
  border: none; border-radius: 10px;
  font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: inherit;
  transition: background 0.15s;
}
.btn-danger:hover { background: #b91c1c; }
.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

.legal-links { display: flex; flex-direction: column; gap: 0.25rem; }
.legal-link {
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0.75rem 0.5rem; border-radius: 8px;
  text-decoration: none; color: #374151; font-size: 0.875rem;
  transition: background 0.15s;
}
.legal-link:hover { background: #f5f2eb; color: #1a1a0e; }
.legal-link svg { color: #a8c47a; flex-shrink: 0; }
</style>
