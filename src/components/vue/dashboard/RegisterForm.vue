<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import { checkEmail, register } from '../../../services/auth';

const auth = useAuthStore();
const email = ref('');
const prenom = ref('');
const nom = ref('');
const password = ref('');
const showPassword = ref(false);
const error = ref('');
const loading = ref(false);
const emailExists = ref(false);
const emailChecked = ref(false);

const redirect = typeof window !== 'undefined'
  ? (new URLSearchParams(window.location.search).get('redirect') ?? '/app/dashboard')
  : '/app/dashboard';

onMounted(async () => {
  if (auth.accessToken) {
    await auth.fetchMe();
    if (auth.isLoggedIn) { window.location.href = '/app/dashboard'; return; }
  }
  const emailParam = new URLSearchParams(window.location.search).get('email');
  if (emailParam) {
    email.value = emailParam;
    await verifyEmail();
  }
});

async function verifyEmail() {
  if (!email.value.trim()) return;
  try {
    const res = await checkEmail(email.value.trim());
    emailExists.value = res.exists;
    emailChecked.value = true;
  } catch { /* non bloquant */ }
}

async function submit() {
  error.value = '';
  if (!email.value || !password.value || !nom.value || !prenom.value) {
    error.value = 'Tous les champs sont requis.';
    return;
  }
  if (password.value.length < 8) {
    error.value = 'Le mot de passe doit contenir au moins 8 caractères.';
    return;
  }
  loading.value = true;
  try {
    const res = await register(email.value.trim(), password.value, nom.value.trim(), prenom.value.trim());
    auth.accessToken = res.accessToken;
    auth.user = res.user;
    window.location.href = redirect;
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
    error.value = msg ?? 'Une erreur est survenue.';
    if (msg?.includes('existe déjà')) emailExists.value = true;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <aside class="login-aside">
      <div class="aside-deco" aria-hidden="true">
        <svg class="deco-leaf deco-leaf--1" viewBox="0 0 200 320" fill="none"><ellipse cx="100" cy="160" rx="80" ry="140" fill="rgba(168,196,122,0.07)" transform="rotate(-20 100 160)"/><ellipse cx="100" cy="160" rx="50" ry="110" fill="rgba(168,196,122,0.05)" transform="rotate(-20 100 160)"/></svg>
        <svg class="deco-leaf deco-leaf--2" viewBox="0 0 200 320" fill="none"><ellipse cx="100" cy="160" rx="80" ry="140" fill="rgba(168,196,122,0.06)" transform="rotate(15 100 160)"/></svg>
      </div>
      <a href="/" class="aside-logo"><img src="/img/logo.png" alt="Gardee" height="38" /></a>
      <div class="aside-content">
        <h2>Rejoignez <em>Gardee</em></h2>
        <p>Créez votre compte client pour suivre vos demandes et répondre à vos prestataires.</p>
      </div>
    </aside>

    <main class="login-main">
      <div class="login-card">
        <div class="card-header">
          <h1>Créer un compte</h1>
          <p>Déjà inscrit ? <a :href="`/app/login?redirect=${encodeURIComponent(redirect)}`">Se connecter</a></p>
        </div>

        <div v-if="emailExists && emailChecked" class="alert-exists">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Un compte existe déjà avec cet email.
          <a :href="`/app/login?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirect)}`">Se connecter →</a>
        </div>

        <form v-else @submit.prevent="submit" class="login-form">
          <div class="field">
            <label for="email">Email</label>
            <input
              id="email" type="email" v-model="email" autocomplete="email"
              placeholder="votre@email.fr" required
              @blur="verifyEmail"
            />
          </div>

          <div class="field-row">
            <div class="field">
              <label for="prenom">Prénom</label>
              <input id="prenom" type="text" v-model="prenom" autocomplete="given-name" placeholder="Jean" required />
            </div>
            <div class="field">
              <label for="nom">Nom</label>
              <input id="nom" type="text" v-model="nom" autocomplete="family-name" placeholder="Dupont" required />
            </div>
          </div>

          <div class="field">
            <label for="password">Mot de passe</label>
            <div class="password-wrap">
              <input
                id="password" :type="showPassword ? 'text' : 'password'" v-model="password"
                autocomplete="new-password" placeholder="8 caractères minimum" required
              />
              <button type="button" class="toggle-pw" @click="showPassword = !showPassword" tabindex="-1">
                <svg v-if="!showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
          </div>

          <p v-if="error" class="error-msg">{{ error }}</p>

          <button type="submit" class="btn-submit" :disabled="loading">
            {{ loading ? 'Création...' : 'Créer mon compte' }}
          </button>

          <div class="forgot-hint">
            Déjà un compte mais mot de passe oublié ?
            <a href="/app/forgot-password">Réinitialiser →</a>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.login-page {
  display: flex; min-height: 100vh;
  background: #f5f2eb; font-family: inherit;
}

.login-aside {
  width: 380px; flex-shrink: 0;
  background: #1a2410; position: relative; overflow: hidden;
  display: flex; flex-direction: column; padding: 2.5rem;
}
.aside-deco { position: absolute; inset: 0; pointer-events: none; }
.deco-leaf { position: absolute; }
.deco-leaf--1 { width: 280px; top: -40px; right: -60px; }
.deco-leaf--2 { width: 220px; bottom: 40px; left: -40px; }

.aside-logo { display: block; margin-bottom: 3rem; position: relative; z-index: 1; }
.aside-logo img { filter: brightness(0) invert(1); }

.aside-content { position: relative; z-index: 1; color: #fff; margin-top: auto; }
.aside-content h2 { font-size: 1.75rem; font-weight: 900; line-height: 1.2; margin: 0 0 0.75rem; }
.aside-content h2 em { color: #a8c47a; font-style: normal; }
.aside-content p { font-size: 0.9rem; color: rgba(255,255,255,0.65); line-height: 1.6; margin: 0; }

.login-main {
  flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem;
}

.login-card {
  width: 100%; max-width: 440px;
  background: #FCFAF5; border: 1.5px solid #e9e5d6; border-radius: 20px;
  padding: 2rem; box-shadow: 0 8px 32px rgba(0,0,0,0.06);
  display: flex; flex-direction: column; gap: 1.5rem;
}

.card-header h1 { font-size: 1.25rem; font-weight: 900; color: #1a1a0e; margin: 0 0 0.25rem; }
.card-header p { font-size: 0.85rem; color: #9ca3af; margin: 0; }
.card-header a { color: #3a5020; font-weight: 600; text-decoration: none; }
.card-header a:hover { text-decoration: underline; }

.alert-exists {
  display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
  background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px;
  padding: 0.75rem 1rem; font-size: 0.875rem; color: #92400e;
}
.alert-exists a { color: #3a5020; font-weight: 700; text-decoration: none; margin-left: auto; }

.login-form { display: flex; flex-direction: column; gap: 1rem; }

.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field-row { display: flex; gap: 0.75rem; }
.field-row .field { flex: 1; }

.field label { font-size: 0.8rem; font-weight: 600; color: #374151; }
.field input {
  padding: 0.6rem 0.875rem; border: 1.5px solid #e9e5d6; border-radius: 8px;
  font-size: 0.9rem; font-family: inherit; color: #1a1a0e; background: #f5f2eb;
  transition: border-color 0.15s, background 0.15s; width: 100%;
}
.field input:focus { outline: none; border-color: #515F37; background: #FCFAF5; }

.password-wrap { position: relative; }
.password-wrap input { padding-right: 2.5rem; width: 100%; }
.toggle-pw {
  position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; color: #9ca3af; padding: 0;
}
.toggle-pw:hover { color: #515F37; }

.error-msg { color: #ef4444; font-size: 0.8rem; margin: 0; }

.btn-submit {
  padding: 0.7rem; background: #3a5020; color: #fff;
  border: none; border-radius: 8px; cursor: pointer;
  font-weight: 700; font-size: 0.9rem; font-family: inherit;
  transition: background 0.15s; margin-top: 0.25rem;
}
.btn-submit:hover:not(:disabled) { background: #253515; }
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

.forgot-hint { font-size: 0.78rem; color: #9ca3af; text-align: center; margin-top: 0.25rem; }
.forgot-hint a { color: #515F37; font-weight: 600; text-decoration: none; }
.forgot-hint a:hover { text-decoration: underline; }

@media (max-width: 700px) {
  .login-aside { display: none; }
  .login-main { padding: 1.5rem 1rem; }
}
</style>
