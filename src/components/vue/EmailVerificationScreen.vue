<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { verifyEmail, resendVerification } from '../../services/auth';
import { useAuthStore } from '../../stores/auth';

const props = defineProps<{ redirect?: string }>();
const auth = useAuthStore();

const userId = ref('');
const digits = ref(['', '', '', '', '', '']);
const loading = ref(false);
const error = ref('');
const resendLoading = ref(false);
const resendSuccess = ref(false);

const inputRefs = ref<HTMLInputElement[]>([]);

function parseHashParams() {
  const hash = window.location.hash.substring(1); // Remove leading #
  const params = new URLSearchParams(hash);
  userId.value = params.get('userId') ?? '';
  const code = params.get('code') ?? '';

  if (code && code.length === 6) {
    const codeDigits = code.split('');
    for (let i = 0; i < 6; i++) {
      digits.value[i] = codeDigits[i] ?? '';
    }
    setTimeout(() => submit(), 500);
  }
}

onMounted(() => {
  parseHashParams();
});

function onDigit(i: number, e: Event) {
  const val = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(-1);
  digits.value[i] = val;
  if (val && i < 5) {
    inputRefs.value[i + 1]?.focus();
  }
}

function onKeydown(i: number, e: KeyboardEvent) {
  if (e.key === 'Backspace' && !digits.value[i] && i > 0) {
    inputRefs.value[i - 1]?.focus();
  }
}

function onPaste(e: ClipboardEvent) {
  e.preventDefault();
  const text = e.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) ?? '';
  for (let i = 0; i < 6; i++) digits.value[i] = text[i] ?? '';
  if (text.length === 6) setTimeout(() => submit(), 100);
}

async function submit() {
  const code = digits.value.join('');
  if (code.length < 6) { error.value = 'Entrez les 6 chiffres du code.'; return; }
  if (!userId.value) { error.value = 'Paramètres manquants.'; return; }
  loading.value = true;
  error.value = '';
  try {
    const res = await verifyEmail(userId.value, code);
    auth.accessToken = res.accessToken;
    auth.user = res.user;
    window.location.href = props.redirect ?? '/app/login';
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
    error.value = msg ?? 'Code invalide. Veuillez réessayer.';
    digits.value = ['', '', '', '', '', ''];
    inputRefs.value[0]?.focus();
  } finally {
    loading.value = false;
  }
}

async function resend() {
  if (!userId.value) { error.value = 'Paramètres manquants.'; return; }
  resendLoading.value = true;
  resendSuccess.value = false;
  try {
    await resendVerification(userId.value);
    resendSuccess.value = true;
    setTimeout(() => (resendSuccess.value = false), 5000);
  } finally {
    resendLoading.value = false;
  }
}
</script>

<template>
  <div class="verify-screen">
    <div class="verify-card">
      <div class="verify-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      </div>
      <h2>Vérifiez votre email</h2>
      <p>Un code à 6 chiffres a été envoyé à votre adresse email. Saisissez-le ci-dessous pour activer votre compte.</p>

      <div class="code-inputs" @paste="onPaste">
        <input
          v-for="(_, i) in digits"
          :key="i"
          :ref="el => { if (el) inputRefs[i] = el as HTMLInputElement }"
          v-model="digits[i]"
          type="text"
          inputmode="numeric"
          maxlength="1"
          class="code-digit"
          :class="{ filled: digits[i] }"
          @input="onDigit(i, $event)"
          @keydown="onKeydown(i, $event)"
          autocomplete="one-time-code"
        />
      </div>

      <p v-if="error" class="verify-error">{{ error }}</p>

      <button class="btn-verify" :disabled="loading || digits.join('').length < 6" @click="submit">
        <span v-if="loading" class="spinner-sm"></span>
        {{ loading ? 'Vérification…' : 'Vérifier mon compte' }}
      </button>

      <div class="resend-row">
        <span>Vous n'avez pas reçu le code ?</span>
        <button class="btn-resend" :disabled="resendLoading" @click="resend">
          {{ resendLoading ? 'Envoi…' : 'Renvoyer' }}
        </button>
      </div>
      <p v-if="resendSuccess" class="resend-ok">Nouveau code envoyé !</p>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.verify-screen {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; background: #f5f2eb; padding: 2rem 1rem;
}
.verify-card {
  background: #FCFAF5; border-radius: 20px;
  padding: 2.5rem 2rem; max-width: 420px; width: 100%;
  box-shadow: 0 8px 32px rgba(0,0,0,0.08); text-align: center;
}
.verify-icon {
  width: 64px; height: 64px; border-radius: 50%;
  background: rgba(58,80,32,0.08); color: #3a5020;
  border: 2px solid rgba(58,80,32,0.15);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1.25rem;
}
.verify-card h2 { font-size: 1.25rem; font-weight: 900; color: #1a1a0e; margin: 0 0 0.75rem; }
.verify-card p { font-size: 0.875rem; color: #6b7280; line-height: 1.65; margin: 0 0 1.5rem; }

.code-inputs {
  display: flex; gap: 0.5rem; justify-content: center;
  margin-bottom: 1rem;
}
.code-digit {
  width: 48px; height: 58px;
  text-align: center; font-size: 1.4rem; font-weight: 800;
  border: 2px solid #e9e5d6; border-radius: 10px;
  background: #f5f2eb; color: #1a1a0e;
  outline: none; transition: border-color 0.15s, background 0.15s;
  font-family: monospace;
}
.code-digit:focus { border-color: #3a5020; background: #FCFAF5; box-shadow: 0 0 0 3px rgba(58,80,32,0.1); }
.code-digit.filled { border-color: #a8c47a; background: #f0f5e8; }

.verify-error { color: #dc2626; font-size: 0.8rem; margin-bottom: 0.75rem; }

.btn-verify {
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  width: 100%; padding: 0.9rem;
  background: #3a5020; color: #fff; border: none; border-radius: 12px;
  font-size: 0.95rem; font-weight: 700; cursor: pointer;
  transition: background 0.15s; font-family: inherit;
  margin-bottom: 1.25rem;
}
.btn-verify:hover:not(:disabled) { background: #2a3c16; }
.btn-verify:disabled { opacity: 0.5; cursor: not-allowed; }

.resend-row {
  display: flex; align-items: center; justify-content: center; gap: 0.4rem;
  font-size: 0.8rem; color: #9ca3af;
}
.btn-resend {
  background: none; border: none; color: #3a5020;
  font-size: 0.8rem; font-weight: 700; cursor: pointer; font-family: inherit;
  transition: color 0.15s;
}
.btn-resend:hover { color: #2a3c16; }
.btn-resend:disabled { opacity: 0.5; cursor: not-allowed; }
.resend-ok { font-size: 0.78rem; color: #3a5020; margin-top: 0.5rem; }

.spinner-sm {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
