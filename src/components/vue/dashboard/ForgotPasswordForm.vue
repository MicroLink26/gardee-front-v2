<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { forgotPassword, resetPassword } from '../../../services/auth';

const mode = ref<'forgot' | 'reset'>('forgot');
let token = '';

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  token = params.get('token') ?? '';
  if (params.has('token')) mode.value = 'reset';
});

const email = ref('');
const password = ref('');
const confirm = ref('');
const showPw = ref(false);
const showConfirm = ref(false);
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
  <div class="fp-page">
    <div class="fp-card">
      <a href="/" class="card-logo">
        <img src="/img/logo.png" alt="Gardee" height="40" />
      </a>

      <!-- Succès : email envoyé -->
      <div v-if="done && mode === 'forgot'" class="state-screen">
        <div class="state-icon state-icon--success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </div>
        <h1>Email envoyé !</h1>
        <p>Si votre adresse est enregistrée, vous recevrez un lien dans quelques minutes. Pensez à vérifier vos spams.</p>
        <a href="/app/login" class="btn-primary">Retour à la connexion</a>
      </div>

      <!-- Succès : mot de passe changé -->
      <div v-else-if="done && mode === 'reset'" class="state-screen">
        <div class="state-icon state-icon--success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h1>Mot de passe modifié</h1>
        <p>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
        <a href="/app/login" class="btn-primary">Se connecter</a>
      </div>

      <!-- Formulaire : demande de reset -->
      <form v-else-if="mode === 'forgot'" @submit.prevent="submitForgot">
        <div class="form-header">
          <h1>Mot de passe oublié ?</h1>
          <p>Entrez votre adresse email et nous vous enverrons un lien de réinitialisation.</p>
        </div>

        <div class="field">
          <label for="email">Adresse email</label>
          <div class="input-wrap">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <input id="email" v-model="email" type="email" required autocomplete="email" placeholder="votre@email.fr" />
          </div>
        </div>

        <div v-if="error" class="error-msg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ error }}
        </div>

        <button type="submit" class="btn-primary" :disabled="loading">
          <span v-if="loading" class="btn-spinner"></span>
          {{ loading ? 'Envoi...' : 'Envoyer le lien' }}
        </button>

        <div class="back-link"><a href="/app/login">← Retour à la connexion</a></div>
      </form>

      <!-- Formulaire : nouveau mot de passe -->
      <form v-else @submit.prevent="submitReset">
        <div class="form-header">
          <h1>Nouveau mot de passe</h1>
          <p>Choisissez un mot de passe sécurisé d'au moins 8 caractères.</p>
        </div>

        <div class="field">
          <label>Nouveau mot de passe</label>
          <div class="input-wrap">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <input v-model="password" :type="showPw ? 'text' : 'password'" required placeholder="8 caractères minimum" />
            <button type="button" class="toggle-pw" @click="showPw = !showPw">
              <svg v-if="showPw" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        <div class="field">
          <label>Confirmer le mot de passe</label>
          <div class="input-wrap">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <input v-model="confirm" :type="showConfirm ? 'text' : 'password'" required placeholder="Répétez votre mot de passe" />
            <button type="button" class="toggle-pw" @click="showConfirm = !showConfirm">
              <svg v-if="showConfirm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        <div class="strength-bar" v-if="password.length > 0">
          <div class="strength-fill" :class="`strength-${Math.min(Math.floor(password.length / 4), 3)}`"></div>
          <span class="strength-label">{{ password.length < 8 ? 'Trop court' : password.length < 12 ? 'Acceptable' : 'Fort' }}</span>
        </div>

        <div v-if="error" class="error-msg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ error }}
        </div>

        <button type="submit" class="btn-primary" :disabled="loading">
          <span v-if="loading" class="btn-spinner"></span>
          {{ loading ? 'Enregistrement...' : 'Enregistrer le mot de passe' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.fp-page {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; background: #f2efe6; padding: 2rem;
}

.fp-card {
  background: #FCFAF5;
  border: 1.5px solid #e9e5d6;
  border-radius: 20px;
  padding: 2.5rem;
  width: 100%; max-width: 420px;
  box-shadow: 0 8px 40px rgba(58,80,32,0.1);
}

.card-logo { display: flex; justify-content: center; margin-bottom: 2rem; }
.card-logo img { height: 40px; }

/* State screens */
.state-screen { text-align: center; padding: 0.5rem 0; }
.state-screen h1 { font-size: 1.5rem; font-weight: 900; color: #1a1a0e; margin: 0 0 0.75rem; }
.state-screen p { color: #6b7280; font-size: 0.9rem; line-height: 1.6; margin-bottom: 1.5rem; }

.state-icon {
  width: 64px; height: 64px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1.25rem;
}
.state-icon svg { width: 28px; height: 28px; }
.state-icon--success { background: rgba(168,196,122,0.18); color: #3a5020; border: 2px solid rgba(168,196,122,0.35); }

/* Form */
.form-header { margin-bottom: 1.75rem; }
.form-header h1 { font-size: 1.5rem; font-weight: 900; color: #1a1a0e; margin: 0 0 0.35rem; }
.form-header p { color: #9ca3af; font-size: 0.875rem; margin: 0; line-height: 1.5; }

.field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; }
label { font-size: 0.8rem; font-weight: 600; color: #515F37; }

.input-wrap { position: relative; }
.input-icon {
  position: absolute; left: 0.875rem; top: 50%;
  transform: translateY(-50%);
  width: 15px; height: 15px; color: #9ca3af; pointer-events: none;
}
input {
  width: 100%;
  padding: 0.7rem 2.75rem 0.7rem 2.5rem;
  border: 1.5px solid #e9e5d6; border-radius: 10px;
  font-size: 0.9rem; background: #f5f2eb; color: #1a1a0e;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s;
}
input:focus { outline: none; border-color: #515F37; background: #FCFAF5; }
input::placeholder { color: #b5ae94; }

.toggle-pw {
  position: absolute; right: 0.75rem; top: 50%;
  transform: translateY(-50%);
  background: none; border: none; cursor: pointer;
  padding: 0.2rem; color: #9ca3af;
  display: flex; align-items: center;
}
.toggle-pw svg { width: 15px; height: 15px; }
.toggle-pw:hover { color: #515F37; }

/* Password strength */
.strength-bar {
  display: flex; align-items: center; gap: 0.6rem;
  margin-bottom: 1rem;
}
.strength-fill {
  flex: 1; height: 4px; border-radius: 999px;
  background: #e9e5d6; position: relative; overflow: hidden;
}
.strength-fill::after {
  content: ''; position: absolute;
  left: 0; top: 0; height: 100%;
  border-radius: 999px;
  transition: width 0.3s, background 0.3s;
}
.strength-0::after { width: 25%; background: #ef4444; }
.strength-1::after { width: 50%; background: #f97316; }
.strength-2::after { width: 75%; background: #eab308; }
.strength-3::after { width: 100%; background: #3a5020; }
.strength-label { font-size: 0.72rem; font-weight: 600; color: #9ca3af; white-space: nowrap; }

.error-msg {
  display: flex; align-items: center; gap: 0.5rem;
  background: #fef2f2; color: #b91c1c;
  border: 1px solid #fecaca;
  padding: 0.65rem 0.875rem; border-radius: 8px;
  font-size: 0.875rem; font-weight: 500;
  margin-bottom: 1rem;
}
.error-msg svg { width: 15px; height: 15px; flex-shrink: 0; }

.btn-primary {
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  width: 100%; padding: 0.85rem;
  background: #3a5020; color: #fff;
  border: none; border-radius: 12px;
  font-size: 0.95rem; font-weight: 700;
  font-family: inherit;
  cursor: pointer; transition: background 0.15s, transform 0.15s;
  text-decoration: none;
}
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { background: #253515; transform: translateY(-1px); }

.btn-spinner {
  width: 15px; height: 15px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.back-link { text-align: center; margin-top: 1.25rem; font-size: 0.875rem; }
.back-link a { color: #515F37; text-decoration: none; font-weight: 600; }
.back-link a:hover { text-decoration: underline; }
</style>
