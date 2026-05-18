<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { confirmRequest } from '../../services/requests';

const props = defineProps<{ token: string }>();
const status = ref<'loading' | 'success' | 'error'>('loading');

onMounted(async () => {
  if (!props.token) { status.value = 'error'; return; }
  try {
    await confirmRequest(props.token);
    status.value = 'success';
  } catch {
    status.value = 'error';
  }
});
</script>

<template>
  <div class="confirm-page">
    <div class="confirm-card">
      <a href="/"><img src="/logo.svg" alt="Gardee" width="120" /></a>
      <div v-if="status === 'loading'" class="loading">Confirmation en cours...</div>
      <div v-else-if="status === 'success'" class="success">
        <p class="icon">✅</p>
        <h1>Demande confirmée !</h1>
        <p>Votre demande a bien été transmise au prestataire. Vous recevrez une réponse par email.</p>
        <a href="/" class="btn">Retour à l'accueil</a>
      </div>
      <div v-else class="error">
        <p class="icon">❌</p>
        <h1>Lien invalide</h1>
        <p>Ce lien est invalide ou a expiré. Veuillez refaire votre demande.</p>
        <a href="/recherche" class="btn btn-outline">Trouver un jardinier</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f9fafb; }
.confirm-card { background: #fff; border-radius: 16px; padding: 3rem 2.5rem; text-align: center; max-width: 440px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
.confirm-card img { margin-bottom: 1.5rem; }
.icon { font-size: 3rem; margin-bottom: 1rem; }
h1 { font-size: 1.5rem; margin-bottom: 0.75rem; }
p { color: #6b7280; margin-bottom: 1.5rem; }
.btn { display: inline-block; padding: 0.7rem 1.75rem; background: #16a34a; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; }
.btn-outline { background: #fff; color: #16a34a; border: 2px solid #16a34a; }
.loading { color: #6b7280; padding: 2rem; }
</style>
