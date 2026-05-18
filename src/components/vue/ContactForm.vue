<script setup lang="ts">
import { ref } from 'vue';
import { api } from '../../services/api';

const form = ref({ name: '', email: '', message: '' });
const loading = ref(false);
const sent = ref(false);
const error = ref('');

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await api.post('/contact', form.value);
    sent.value = true;
  } catch {
    error.value = 'Une erreur est survenue. Veuillez réessayer.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="contact-form-card">
    <div v-if="sent" class="success">
      <p class="icon">✅</p>
      <h3>Message envoyé !</h3>
      <p>Nous vous répondrons sous 24h.</p>
    </div>
    <form v-else @submit.prevent="submit">
      <div class="field">
        <label>Votre nom *</label>
        <input v-model="form.name" type="text" required />
      </div>
      <div class="field">
        <label>Email *</label>
        <input v-model="form.email" type="email" required />
      </div>
      <div class="field">
        <label>Message *</label>
        <textarea v-model="form.message" rows="6" required placeholder="Votre message..."></textarea>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <button type="submit" class="btn-primary" :disabled="loading">
        {{ loading ? 'Envoi...' : 'Envoyer' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.contact-form-card { background: #fff; border-radius: 16px; padding: 2rem; border: 1px solid #e5e7eb; }
.field { margin-bottom: 1rem; }
label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.3rem; color: #374151; }
input, textarea { width: 100%; padding: 0.65rem 0.875rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box; resize: vertical; }
input:focus, textarea:focus { outline: none; border-color: #16a34a; }
.error { color: #ef4444; font-size: 0.875rem; margin-bottom: 0.75rem; }
.btn-primary { width: 100%; padding: 0.75rem; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { background: #15803d; }
.success { text-align: center; padding: 2rem 0; }
.icon { font-size: 3rem; margin-bottom: 0.75rem; }
h3 { font-size: 1.25rem; margin-bottom: 0.5rem; }
.success p { color: #6b7280; }
</style>
