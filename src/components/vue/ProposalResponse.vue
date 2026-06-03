<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { clientAcceptProposalByToken, clientRefuseProposalByToken } from '../../services/requests';

const props = defineProps<{ action: 'accept' | 'refuse' }>();
const status = ref<'loading' | 'success' | 'error'>('loading');

onMounted(async () => {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  if (!token) { status.value = 'error'; return; }
  try {
    if (props.action === 'accept') {
      await clientAcceptProposalByToken(token);
    } else {
      await clientRefuseProposalByToken(token);
    }
    status.value = 'success';
  } catch {
    status.value = 'error';
  }
});
</script>

<template>
  <div class="confirm-page">
    <div class="confirm-card">
      <a href="/"><img src="/img/logo.png" alt="Gardee" width="120" /></a>

      <div v-if="status === 'loading'" class="loading">
        <div class="spinner"></div>
        <p>{{ action === 'accept' ? 'Confirmation en cours...' : 'Traitement en cours...' }}</p>
      </div>

      <template v-else-if="status === 'success'">
        <div v-if="action === 'accept'" class="state">
          <div class="state-icon state-icon--success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h1>Date confirmée !</h1>
          <p>Votre rendez-vous est confirmé. Vous recevrez un rappel par email la veille de la prestation.</p>
          <a href="/" class="btn btn-accept">Retour à l'accueil</a>
        </div>
        <div v-else class="state">
          <div class="state-icon state-icon--neutral">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <h1>Date déclinée</h1>
          <p>Votre réponse a été transmise au prestataire. Il pourra vous proposer une nouvelle date.</p>
          <a href="/" class="btn btn-neutral">Retour à l'accueil</a>
        </div>
      </template>

      <div v-else class="state">
        <div class="state-icon state-icon--error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <h1>Lien invalide</h1>
        <p>Ce lien est invalide ou a expiré (validité 7 jours). Contactez votre prestataire directement.</p>
        <a href="/" class="btn btn-neutral">Retour à l'accueil</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }
.confirm-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #faf8f2; padding: 1rem; }
.confirm-card {
  background: #FCFAF5; border: 1.5px solid #e5e2d3;
  border-radius: 20px; padding: 2.5rem;
  text-align: center; max-width: 440px; width: 100%;
  box-shadow: 0 8px 40px rgba(81,95,55,0.08);
}
.confirm-card img { margin-bottom: 2rem; }

.loading { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 2rem 0; color: #9ca3af; font-size: 0.875rem; }
.spinner { width: 28px; height: 28px; border: 3px solid #e5e2d3; border-top-color: #515F37; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.state { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
.state h1 { font-size: 1.5rem; font-weight: 900; color: #1a1a0e; margin: 0; }
.state p { color: #6b7280; font-size: 0.9rem; line-height: 1.6; margin: 0; max-width: 320px; }

.state-icon { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 0.25rem; }
.state-icon svg { width: 28px; height: 28px; }
.state-icon--success { background: #f0ede3; color: #515F37; }
.state-icon--neutral { background: #f3f4f6; color: #6b7280; }
.state-icon--error { background: #fee2e2; color: #dc2626; }

.btn { display: inline-block; margin-top: 0.75rem; padding: 0.7rem 1.75rem; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 0.875rem; }
.btn-accept { background: #3a5020; color: #fff; }
.btn-accept:hover { background: #253515; }
.btn-neutral { background: #f5f2eb; color: #515F37; border: 1.5px solid #d6cda4; }
.btn-neutral:hover { background: #eae7db; }
</style>
