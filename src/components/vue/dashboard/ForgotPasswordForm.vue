<script setup lang="ts">
import { ref } from 'vue';
import { forgotPassword, resetPassword } from '../../../services/auth';

const mode = ref<'forgot' | 'reset'>(
  new URLSearchParams(window.location.search).has('token') ? 'reset' : 'forgot'
);
const token = new URLSearchParams(window.location.search).get('token') ?? '';

const email = ref('');
const password = ref('');
const confirm = ref('');
const loading = ref(false);
const done = ref(false);
const error = ref('');

async function submitForgot() {
  error.value = '';
  loading.value = true;
  try {
    await forgotPassword(email.value.trim().toLowerCase());
    done.value = true;
  } catch {
    error.value = 'Une erreur est survenue.';
  } finally {
    loading.value = false;
  }
}

async function submitReset() {
  if (password.value !== confirm.value) { error.value = 'Les mots de passe ne correspondent pas.'; return; }
  if (password.value.length < 8) { error.value = 'Le mot de passe doit faire au moins 8 caractères.'; return; }
  error.value = '';
  loading.value = true;
  try {
    await resetPassword(token, password.value);
    done.value = true;
  } catch {
    error.value = 'Lien invalide ou expiré.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="page-wrapper">
    <div class="card">
      <a href="/"><img src="/logo.svg" alt="Gardee" width="120" class="logo" /></a>

      <div v-if="done && mode === 'forgot'" class="success">
        <p class="icon">📧</p>
        <h1>Email envoyé</h1>
        <p>Si votre adresse est enregistrée, vous recevrez un lien dans quelques minutes.</p>
        <a href="/app/login" class="btn-primary">Retour à la connexion</a>
      </div>

      <div v-else-if="done && mode === 'reset'" class="success">
        <p class="icon">✅</p>
        <h1>Mot de passe modifié</h1>
        <p>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
        <a href="/app/login" class="btn-primary">Se connecter</a>
      </div>

      <form v-else-if="mode === 'forgot'" @submit.prevent="submitForgot">
        <h1>Mot de passe oublié</h1>
        <p class="subtitle">Entrez votre email pour recevoir un lien de réinitialisation.</p>
        <div class="field">
          <label>Email</label>
          <input v-model="email" type="email" required autocomplete="email" />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'Envoi...' : 'Envoyer le lien' }}</button>
        <div class="back-link"><a href="/app/login">← Retour à la connexion</a></div>
      </form>

      <form v-else @submit.prevent="submitReset">
        <h1>Nouveau mot de passe</h1>
        <p class="subtitle">Choisissez un nouveau mot de passe sécurisé.</p>
        <div class="field">
          <label>Nouveau mot de passe</label>
          <input v-model="password" type="password" required placeholder="8 caractères minimum" />
        </div>
        <div class="field">
          <label>Confirmer le mot de passe</label>
          <input v-model="confirm" type="password" required />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'Enregistrement...' : 'Enregistrer' }}</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.page-wrapper { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f9fafb; }
.card { background: #fff; border-radius: 16px; padding: 2.5rem; width: 100%; max-width: 400px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
.logo { display: block; margin: 0 auto 1.5rem; }
h1 { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.35rem; }
.subtitle { color: #6b7280; margin-bottom: 1.25rem; font-size: 0.9rem; }
.field { margin-bottom: 1rem; }
label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.3rem; color: #374151; }
input { width: 100%; padding: 0.65rem 0.875rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 1rem; box-sizing: border-box; }
input:focus { outline: none; border-color: #16a34a; }
.error { color: #ef4444; font-size: 0.875rem; margin-bottom: 0.75rem; }
.btn-primary { width: 100%; padding: 0.75rem; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { background: #15803d; }
a.btn-primary { display: block; text-align: center; text-decoration: none; margin-top: 1rem; }
.back-link { text-align: center; margin-top: 1rem; font-size: 0.875rem; }
.back-link a { color: #16a34a; text-decoration: none; }
.success { text-align: center; padding: 1rem 0; }
.icon { font-size: 3rem; margin-bottom: 1rem; }
.success h1 { margin-bottom: 0.75rem; }
.success p { color: #6b7280; margin-bottom: 1rem; }
</style>
