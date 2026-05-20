<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../../stores/auth';

const auth = useAuthStore();
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const error = ref('');
const loading = ref(false);

const redirect = typeof window !== 'undefined'
  ? (new URLSearchParams(window.location.search).get('redirect') ?? '/app/dashboard')
  : '/app/dashboard';

onMounted(async () => {
  if (auth.accessToken) {
    await auth.fetchMe();
    if (auth.isLoggedIn) window.location.href = '/app/dashboard';
  }
});

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    window.location.href = redirect;
  } catch {
    error.value = 'Email ou mot de passe incorrect.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <aside class="login-aside">
      <a href="/" class="aside-logo">
        <img src="/logo.png" alt="Gardee" height="40" />
      </a>
      <div class="aside-content">
        <h2>L'espace pro<br>des jardiniers</h2>
        <p>Gérez vos demandes, votre profil et votre activité depuis un seul endroit.</p>
        <ul class="aside-features">
          <li>
            <span class="feat-icon">📋</span>
            <span>Suivez vos demandes en temps réel</span>
          </li>
          <li>
            <span class="feat-icon">⭐</span>
            <span>Consultez vos avis clients</span>
          </li>
          <li>
            <span class="feat-icon">📍</span>
            <span>Apparaissez sur la carte Gardee</span>
          </li>
        </ul>
      </div>
      <img src="/arbrePostuler.png" alt="" class="aside-illustration" />
    </aside>

    <main class="login-main">
      <div class="login-box">
        <div class="login-header">
          <h1>Connexion</h1>
          <p>Bienvenue sur votre espace Gardee</p>
        </div>

        <form @submit.prevent="submit" class="login-form">
          <div class="field">
            <label for="email">Adresse email</label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <input id="email" v-model="email" type="email" required autocomplete="email" placeholder="votre@email.fr" />
            </div>
          </div>

          <div class="field">
            <label for="password">Mot de passe</label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                placeholder="••••••••"
              />
              <button type="button" class="toggle-pw" @click="showPassword = !showPassword" :aria-label="showPassword ? 'Masquer' : 'Afficher'">
                <svg v-if="showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>

          <div class="forgot-link">
            <a href="/app/forgot-password">Mot de passe oublié ?</a>
          </div>

          <div v-if="error" class="error-msg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {{ error }}
          </div>

          <button type="submit" class="btn-submit" :disabled="loading">
            <span v-if="loading" class="btn-spinner"></span>
            {{ loading ? 'Connexion...' : 'Se connecter' }}
          </button>
        </form>

        <div class="login-footer">
          <span>Pas encore prestataire ?</span>
          <a href="/postuler">Rejoindre Gardee →</a>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.login-page {
  display: flex;
  min-height: 100vh;
}

/* ── ASIDE ── */
.login-aside {
  width: 420px;
  background: linear-gradient(160deg, #515F37 0%, #3d4a28 100%);
  display: flex;
  flex-direction: column;
  padding: 2rem;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.aside-logo { display: block; margin-bottom: 2.5rem; }
.aside-logo img { height: 40px; }

.aside-content { flex: 1; }
.aside-content h2 {
  font-size: 2rem;
  font-weight: 900;
  color: #fff;
  line-height: 1.15;
  margin: 0 0 0.75rem;
  letter-spacing: -0.02em;
}
.aside-content p {
  color: rgba(255,255,255,0.7);
  font-size: 0.95rem;
  margin: 0 0 2rem;
  line-height: 1.6;
}

.aside-features { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.875rem; }
.aside-features li { display: flex; align-items: center; gap: 0.75rem; }
.feat-icon { font-size: 1.25rem; flex-shrink: 0; }
.aside-features li span:last-child { color: rgba(255,255,255,0.85); font-size: 0.9rem; }

.aside-illustration {
  height: 180px;
  object-fit: contain;
  align-self: flex-end;
  opacity: 0.9;
  margin-top: 1rem;
}

/* ── MAIN ── */
.login-main {
  flex: 1;
  background: #faf8f2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.login-box {
  width: 100%;
  max-width: 420px;
}

.login-header { margin-bottom: 2rem; }
.login-header h1 { font-size: 1.75rem; font-weight: 900; color: #1a1a0e; margin: 0 0 0.35rem; }
.login-header p { color: #9ca3af; font-size: 0.9rem; margin: 0; }

.login-form { display: flex; flex-direction: column; gap: 1rem; }

.field { display: flex; flex-direction: column; gap: 0.35rem; }
label { font-size: 0.825rem; font-weight: 600; color: #374151; }

.input-wrap { position: relative; }
.input-icon {
  position: absolute;
  left: 0.875rem; top: 50%;
  transform: translateY(-50%);
  width: 16px; height: 16px;
  color: #9ca3af;
  pointer-events: none;
}
input {
  width: 100%;
  padding: 0.7rem 0.875rem 0.7rem 2.5rem;
  border: 1.5px solid #e5e2d3;
  border-radius: 10px;
  font-size: 0.95rem;
  background: #fff;
  color: #1a1a0e;
  transition: border-color 0.15s;
}
input:focus { outline: none; border-color: #515F37; }
input::placeholder { color: #c4ba8e; }

.toggle-pw {
  position: absolute;
  right: 0.75rem; top: 50%;
  transform: translateY(-50%);
  background: none; border: none; cursor: pointer;
  padding: 0.25rem; color: #9ca3af;
  display: flex; align-items: center;
}
.toggle-pw svg { width: 16px; height: 16px; }
.toggle-pw:hover { color: #515F37; }

.forgot-link { text-align: right; margin-top: -0.25rem; }
.forgot-link a { font-size: 0.8rem; color: #515F37; text-decoration: none; font-weight: 600; }
.forgot-link a:hover { text-decoration: underline; }

.error-msg {
  display: flex; align-items: center; gap: 0.5rem;
  background: #fee2e2; color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
}
.error-msg svg { width: 16px; height: 16px; flex-shrink: 0; }

.btn-submit {
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  width: 100%;
  padding: 0.8rem;
  background: #515F37; color: #fff;
  border: none; border-radius: 10px;
  font-size: 1rem; font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
  margin-top: 0.5rem;
}
.btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-submit:hover:not(:disabled) { background: #3d4a28; }

.btn-spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.login-footer {
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  margin-top: 1.5rem;
  font-size: 0.875rem; color: #9ca3af;
}
.login-footer a { color: #515F37; font-weight: 700; text-decoration: none; }
.login-footer a:hover { text-decoration: underline; }

@media (max-width: 768px) {
  .login-aside { display: none; }
  .login-main { padding: 1.5rem; align-items: flex-start; padding-top: 3rem; }
}
</style>
