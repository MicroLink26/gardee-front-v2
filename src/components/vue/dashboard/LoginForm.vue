<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import EmailVerificationScreen from '../EmailVerificationScreen.vue';

const auth = useAuthStore();
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const error = ref('');
const loading = ref(false);
const pendingVerificationUserId = ref<string | null>(null);

const redirect = typeof window !== 'undefined'
  ? (new URLSearchParams(window.location.search).get('redirect') ?? '/app/dashboard')
  : '/app/dashboard';

onMounted(async () => {
  if (auth.accessToken) {
    await auth.fetchMe();
    if (auth.isLoggedIn) window.location.href = '/app/dashboard';
  }
  const emailParam = new URLSearchParams(window.location.search).get('email');
  if (emailParam) email.value = emailParam;
});

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    window.location.href = redirect;
  } catch (e: unknown) {
    const data = (e as { response?: { data?: { requiresVerification?: boolean; userId?: string; error?: string } } })?.response?.data;
    if (data?.requiresVerification && data.userId) {
      pendingVerificationUserId.value = data.userId;
    } else {
      error.value = data?.error ?? 'Email ou mot de passe incorrect.';
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <EmailVerificationScreen v-if="pendingVerificationUserId" :userId="pendingVerificationUserId" :redirect="redirect" />

  <div v-else class="login-page">
    <aside class="login-aside">
      <!-- Botanical decorations -->
      <div class="aside-deco" aria-hidden="true">
        <svg class="deco-leaf deco-leaf--1" viewBox="0 0 200 320" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="100" cy="160" rx="80" ry="140" fill="rgba(168,196,122,0.07)" transform="rotate(-20 100 160)"/>
          <ellipse cx="100" cy="160" rx="50" ry="110" fill="rgba(168,196,122,0.05)" transform="rotate(-20 100 160)"/>
        </svg>
        <svg class="deco-leaf deco-leaf--2" viewBox="0 0 200 320" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="100" cy="160" rx="80" ry="140" fill="rgba(168,196,122,0.06)" transform="rotate(15 100 160)"/>
        </svg>
        <svg class="deco-leaf deco-leaf--3" viewBox="0 0 160 260" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="80" cy="130" rx="60" ry="110" fill="rgba(168,196,122,0.05)" transform="rotate(35 80 130)"/>
        </svg>
      </div>

      <a href="/" class="aside-logo">
        <img src="/img/logo.png" alt="Gardee" height="38" />
      </a>

      <div class="aside-content">
        <h2>Bienvenue sur <em>Gardee</em></h2>
        <p>Votre espace personnel pour gérer vos demandes et votre activité.</p>

        <div class="aside-tabs">
          <div class="aside-tab">
            <div class="aside-tab-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div>
              <strong>Vous êtes client ?</strong>
              <span>Suivez vos réservations et échangez avec vos jardiniers.</span>
            </div>
          </div>
          <div class="aside-tab">
            <div class="aside-tab-icon aside-tab-icon--pro">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <strong>Vous êtes jardinier ?</strong>
              <span>Gérez votre profil, vos demandes et votre classement.</span>
            </div>
          </div>
        </div>

        <div class="aside-stats">
          <span>+500 prestataires</span>
          <span class="stat-dot"></span>
          <span>4,7★ moyenne</span>
          <span class="stat-dot"></span>
          <span>Gratuit</span>
        </div>
      </div>

      <img src="/img/arbrePostuler.svg" alt="" class="aside-illustration" />
    </aside>

    <main class="login-main">
      <div class="login-box">
        <div class="login-header">
          <h1>Connexion</h1>
          <p>Accédez à votre espace client ou prestataire</p>
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
          <span>Pas de compte client ?</span>
          <a href="/app/register">Créer un compte →</a>
        </div>
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
  background: linear-gradient(155deg, #141f0b 0%, #253515 55%, #3a5020 100%);
  display: flex;
  flex-direction: column;
  padding: 2.25rem 2rem;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

/* Botanical decorations */
.aside-deco { position: absolute; inset: 0; pointer-events: none; }
.deco-leaf { position: absolute; }
.deco-leaf--1 { top: -60px; right: -40px; width: 200px; height: 320px; }
.deco-leaf--2 { bottom: 80px; left: -60px; width: 180px; height: 290px; transform: scaleX(-1); }
.deco-leaf--3 { top: 40%; right: -30px; width: 140px; height: 220px; }

.aside-logo { display: block; margin-bottom: 2.75rem; position: relative; z-index: 1; }
.aside-logo img { height: 38px; }

.aside-content { flex: 1; position: relative; z-index: 1; }

.aside-content h2 {
  font-size: 2rem;
  font-weight: 900;
  color: #fff;
  line-height: 1.15;
  margin: 0 0 0.875rem;
  letter-spacing: -0.02em;
}
.aside-content h2 em {
  font-style: italic;
  color: #a8c47a;
}
.aside-content p {
  color: rgba(255,255,255,0.65);
  font-size: 0.9rem;
  margin: 0 0 2rem;
  line-height: 1.65;
}

.aside-tabs { display: flex; flex-direction: column; gap: 0.75rem; margin: 1.5rem 0; }
.aside-tab {
  display: flex; align-items: flex-start; gap: 0.875rem;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px; padding: 0.875rem 1rem;
}
.aside-tab-icon {
  width: 38px; height: 38px; flex-shrink: 0;
  background: rgba(168,196,122,0.15); border: 1px solid rgba(168,196,122,0.25);
  border-radius: 10px; display: flex; align-items: center; justify-content: center;
  color: #a8c47a;
}
.aside-tab-icon--pro {
  background: rgba(58,80,32,0.3); border-color: rgba(168,196,122,0.4); color: #c8e09a;
}
.aside-tab div:last-child { display: flex; flex-direction: column; gap: 0.2rem; }
.aside-tab strong { font-size: 0.85rem; color: #fff; font-weight: 700; }
.aside-tab span { font-size: 0.78rem; color: rgba(255,255,255,0.6); line-height: 1.4; }

.aside-stats {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 2rem;
  flex-wrap: wrap;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.5);
  font-weight: 500;
}
.stat-dot {
  width: 3px; height: 3px;
  background: rgba(255,255,255,0.3);
  border-radius: 50%;
}

.aside-illustration {
  height: 160px;
  object-fit: contain;
  align-self: flex-end;
  opacity: 0.85;
  margin-top: 1.5rem;
  position: relative;
  z-index: 1;
}

/* ── MAIN ── */
.login-main {
  flex: 1;
  background: #f2efe6;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.login-box {
  width: 100%;
  max-width: 420px;
  background: #FCFAF5;
  border-radius: 20px;
  padding: 2.5rem;
  border: 1px solid #e9e5d6;
  box-shadow: 0 8px 40px rgba(58,80,32,0.08);
}

.login-header { margin-bottom: 2rem; }
.login-eyebrow {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #a8c47a;
  margin-bottom: 0.5rem;
}
.login-header h1 { font-size: 1.75rem; font-weight: 900; color: #1a1a0e; margin: 0 0 0.3rem; letter-spacing: -0.02em; }
.login-header p { color: #9ca3af; font-size: 0.875rem; margin: 0; }

.login-form { display: flex; flex-direction: column; gap: 1rem; }

.field { display: flex; flex-direction: column; gap: 0.4rem; }
label { font-size: 0.8rem; font-weight: 600; color: #515F37; }

.input-wrap { position: relative; }
.input-icon {
  position: absolute;
  left: 0.875rem; top: 50%;
  transform: translateY(-50%);
  width: 15px; height: 15px;
  color: #9ca3af;
  pointer-events: none;
}
input {
  width: 100%;
  padding: 0.7rem 0.875rem 0.7rem 2.5rem;
  border: 1.5px solid #e9e5d6;
  border-radius: 10px;
  font-size: 0.925rem;
  background: #f5f2eb;
  color: #1a1a0e;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s;
}
input:focus { outline: none; border-color: #515F37; background: #FCFAF5; }
input::placeholder { color: #c4ba8e; }

.toggle-pw {
  position: absolute;
  right: 0.75rem; top: 50%;
  transform: translateY(-50%);
  background: none; border: none; cursor: pointer;
  padding: 0.25rem; color: #9ca3af;
  display: flex; align-items: center;
}
.toggle-pw svg { width: 15px; height: 15px; }
.toggle-pw:hover { color: #515F37; }

.forgot-link { text-align: right; margin-top: -0.25rem; }
.forgot-link a { font-size: 0.8rem; color: #515F37; text-decoration: none; font-weight: 600; }
.forgot-link a:hover { text-decoration: underline; }

.error-msg {
  display: flex; align-items: center; gap: 0.5rem;
  background: #fef2f2; color: #b91c1c;
  border: 1px solid #fecaca;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 500;
}
.error-msg svg { width: 15px; height: 15px; flex-shrink: 0; }

.btn-submit {
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  width: 100%;
  padding: 0.85rem;
  background: #3a5020; color: #fff;
  border: none; border-radius: 12px;
  font-size: 0.95rem; font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, transform 0.15s;
  margin-top: 0.5rem;
  letter-spacing: 0.01em;
}
.btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-submit:hover:not(:disabled) { background: #253515; transform: translateY(-1px); }

.btn-spinner {
  width: 15px; height: 15px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.login-footer {
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e9e5d6;
  font-size: 0.875rem; color: #9ca3af;
}
.login-footer a { color: #515F37; font-weight: 700; text-decoration: none; }
.login-footer a:hover { text-decoration: underline; }

@media (max-width: 768px) {
  .login-aside { display: none; }
  .login-main { padding: 1.5rem; align-items: flex-start; padding-top: 3rem; background: #f2efe6; }
  .login-box { box-shadow: none; }
}
</style>
