<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../../../stores/auth';

const auth = useAuthStore();
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const error = ref('');
const loading = ref(false);

const redirect = new URLSearchParams(window.location.search).get('redirect') ?? '/app/dashboard';

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
  <div class="login-wrapper">
    <div class="login-card">
      <a href="/"><img src="/logo.svg" alt="Gardee" width="120" class="logo" /></a>
      <h1>Connexion</h1>

      <form @submit.prevent="submit">
        <div class="field">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" required autocomplete="email" />
        </div>
        <div class="field">
          <label for="password">Mot de passe</label>
          <div class="password-input">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="current-password"
            />
            <button type="button" class="toggle-pw" @click="showPassword = !showPassword">
              {{ showPassword ? '🙈' : '👁' }}
            </button>
          </div>
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Connexion...' : 'Se connecter' }}
        </button>
      </form>

      <div class="login-links">
        <a href="/app/forgot-password">Mot de passe oublié ?</a>
        <span>·</span>
        <a href="/postuler">Devenir prestataire</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f9fafb; }
.login-card { background: #fff; border-radius: 16px; padding: 2.5rem; width: 100%; max-width: 400px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
.logo { display: block; margin: 0 auto 1.5rem; }
h1 { text-align: center; font-size: 1.5rem; margin-bottom: 1.5rem; }
.field { margin-bottom: 1rem; }
label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.35rem; color: #374151; }
input { width: 100%; padding: 0.6rem 0.875rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 1rem; box-sizing: border-box; }
input:focus { outline: none; border-color: #16a34a; }
.password-input { position: relative; }
.password-input input { padding-right: 2.5rem; }
.toggle-pw { position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; }
.error { color: #dc2626; font-size: 0.875rem; margin-bottom: 0.75rem; }
.btn-primary { width: 100%; padding: 0.75rem; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; margin-top: 0.5rem; }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { background: #15803d; }
.login-links { display: flex; justify-content: center; gap: 0.75rem; margin-top: 1.25rem; font-size: 0.875rem; }
.login-links a { color: #16a34a; text-decoration: none; }
</style>
