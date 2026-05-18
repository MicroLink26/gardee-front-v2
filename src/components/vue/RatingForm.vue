<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { validateToken, submitReview } from '../../services/reviews';
import type { RatingDetails } from '../../types';
import RatingStars from './RatingStars.vue';

const props = defineProps<{ token: string }>();
const state = ref<'loading' | 'form' | 'success' | 'error'>('loading');
const sending = ref(false);

const ratings = ref<RatingDetails>({ time: 0, quality: 0, sympathy: 0, value: 0, punctuality: 0 });
const recommend = ref<boolean | undefined>(undefined);
const comment = ref('');

const CRITERIA: { key: keyof RatingDetails; label: string }[] = [
  { key: 'quality', label: 'Qualité du travail' },
  { key: 'punctuality', label: 'Ponctualité' },
  { key: 'time', label: 'Respect des délais' },
  { key: 'sympathy', label: 'Professionnalisme' },
  { key: 'value', label: 'Rapport qualité/prix' },
];

onMounted(async () => {
  if (!props.token) { state.value = 'error'; return; }
  try {
    await validateToken(props.token);
    state.value = 'form';
  } catch {
    state.value = 'error';
  }
});

async function submit() {
  const allRated = CRITERIA.every(c => ratings.value[c.key] > 0);
  if (!allRated) return;
  sending.value = true;
  try {
    await submitReview({ token: props.token, ratings: ratings.value, recommend: recommend.value, comment: comment.value || undefined });
    state.value = 'success';
  } catch {
    alert('Une erreur est survenue.');
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="rating-page">
    <div class="rating-card">
      <a href="/"><img src="/logo.svg" alt="Gardee" width="120" /></a>

      <div v-if="state === 'loading'" class="loading">Chargement...</div>

      <div v-else-if="state === 'error'" class="error-state">
        <p class="icon">❌</p>
        <h1>Lien invalide</h1>
        <p>Ce lien est invalide ou a déjà été utilisé.</p>
      </div>

      <div v-else-if="state === 'success'" class="success-state">
        <p class="icon">🌟</p>
        <h1>Merci pour votre avis !</h1>
        <p>Votre évaluation a bien été enregistrée.</p>
        <a href="/" class="btn">Retour à l'accueil</a>
      </div>

      <form v-else @submit.prevent="submit">
        <h1>Donnez votre avis</h1>
        <p class="form-sub">Comment s'est passée votre prestation ?</p>

        <div v-for="c in CRITERIA" :key="c.key" class="rating-field">
          <label>{{ c.label }}</label>
          <RatingStars v-model="ratings[c.key]" />
        </div>

        <div class="recommend-field">
          <label>Recommanderiez-vous ce prestataire ?</label>
          <div class="recommend-btns">
            <button type="button" :class="['rec-btn', { active: recommend === true }]" @click="recommend = true">👍 Oui</button>
            <button type="button" :class="['rec-btn', { active: recommend === false }]" @click="recommend = false">👎 Non</button>
          </div>
        </div>

        <div class="field">
          <label>Commentaire (facultatif)</label>
          <textarea v-model="comment" rows="4" placeholder="Partagez votre expérience..."></textarea>
        </div>

        <button type="submit" class="btn" :disabled="sending || !CRITERIA.every(c => ratings[c.key] > 0)">
          {{ sending ? 'Envoi...' : 'Envoyer mon avis' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.rating-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f9fafb; padding: 2rem; }
.rating-card { background: #fff; border-radius: 16px; padding: 2.5rem; width: 100%; max-width: 480px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
.rating-card img { display: block; margin: 0 auto 1.5rem; }
h1 { font-size: 1.5rem; margin-bottom: 0.35rem; }
.form-sub { color: #6b7280; margin-bottom: 1.5rem; }
.rating-field { margin-bottom: 1.25rem; }
label { display: block; font-size: 0.9rem; font-weight: 500; margin-bottom: 0.4rem; color: #374151; }
.recommend-field { margin-bottom: 1.25rem; }
.recommend-btns { display: flex; gap: 0.75rem; }
.rec-btn { padding: 0.5rem 1.5rem; border: 1.5px solid #d1d5db; border-radius: 8px; background: #fff; cursor: pointer; font-size: 1rem; }
.rec-btn.active { border-color: #16a34a; background: #f0fdf4; color: #16a34a; }
.field { margin-bottom: 1.25rem; }
textarea { width: 100%; padding: 0.6rem 0.875rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box; resize: vertical; }
.btn { display: block; width: 100%; padding: 0.75rem; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; text-align: center; text-decoration: none; margin-top: 0.5rem; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.loading, .icon { text-align: center; }
.icon { font-size: 3rem; margin-bottom: 1rem; }
.error-state, .success-state { text-align: center; }
</style>
