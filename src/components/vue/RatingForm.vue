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

const CRITERIA: { key: keyof RatingDetails; label: string; icon: string }[] = [
  { key: 'quality', label: 'Qualité du travail', icon: '⭐' },
  { key: 'punctuality', label: 'Ponctualité', icon: '⏱' },
  { key: 'time', label: 'Respect des délais', icon: '📅' },
  { key: 'sympathy', label: 'Professionnalisme', icon: '🤝' },
  { key: 'value', label: 'Rapport qualité/prix', icon: '💶' },
];

const allRated = () => CRITERIA.every(c => ratings.value[c.key] > 0);

const resolvedToken = () => props.token || new URLSearchParams(window.location.search).get('token') || '';

onMounted(async () => {
  const token = resolvedToken();
  if (!token) { state.value = 'error'; return; }
  try {
    await validateToken(token);
    state.value = 'form';
  } catch {
    state.value = 'error';
  }
});

async function submit() {
  if (!allRated()) return;
  sending.value = true;
  try {
    await submitReview({ token: resolvedToken(), ratings: ratings.value, recommend: recommend.value, comment: comment.value || undefined });
    state.value = 'success';
  } catch {
    alert('Une erreur est survenue, veuillez réessayer.');
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="rating-page">
    <div class="rating-card">
      <a href="/" class="card-logo">
        <img src="/img/logo.png" alt="Gardee" height="40" />
      </a>

      <!-- Chargement -->
      <div v-if="state === 'loading'" class="state-center">
        <div class="spinner"></div>
        <p>Vérification du lien...</p>
      </div>

      <!-- Erreur -->
      <div v-else-if="state === 'error'" class="state-screen">
        <div class="state-icon state-icon--error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <h1>Lien invalide</h1>
        <p>Ce lien est invalide ou a déjà été utilisé. Vérifiez votre email ou contactez-nous.</p>
        <a href="/" class="btn-primary">Retour à l'accueil</a>
      </div>

      <!-- Succès -->
      <div v-else-if="state === 'success'" class="state-screen">
        <div class="state-icon state-icon--success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h1>Merci pour votre avis !</h1>
        <p>Votre évaluation a bien été enregistrée et aidera d'autres clients à choisir leur jardinier.</p>
        <a href="/classement" class="btn-primary">Voir le classement</a>
      </div>

      <!-- Formulaire -->
      <form v-else @submit.prevent="submit">
        <div class="form-header">
          <h1>Votre avis compte</h1>
          <p>Évaluez votre prestation pour aider la communauté Gardee</p>
        </div>

        <div class="criteria-list">
          <div v-for="c in CRITERIA" :key="c.key" class="criterion">
            <div class="criterion-label">
              <span class="criterion-icon">{{ c.icon }}</span>
              {{ c.label }}
            </div>
            <RatingStars v-model="ratings[c.key]" />
          </div>
        </div>

        <div class="recommend-field">
          <label class="field-label">Recommanderiez-vous ce prestataire ?</label>
          <div class="recommend-btns">
            <button
              type="button"
              :class="['rec-btn', 'rec-btn--yes', { active: recommend === true }]"
              @click="recommend = true"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
              Oui, je recommande
            </button>
            <button
              type="button"
              :class="['rec-btn', 'rec-btn--no', { active: recommend === false }]"
              @click="recommend = false"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></svg>
              Non
            </button>
          </div>
        </div>

        <div class="comment-field">
          <label for="comment" class="field-label">Commentaire <span class="optional">(facultatif)</span></label>
          <textarea
            id="comment"
            v-model="comment"
            rows="4"
            placeholder="Partagez votre expérience en détail..."
          ></textarea>
        </div>

        <div v-if="!allRated()" class="warning-msg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Veuillez noter tous les critères avant d'envoyer.
        </div>

        <button type="submit" class="btn-primary" :disabled="sending || !allRated()">
          <span v-if="sending" class="btn-spinner"></span>
          {{ sending ? 'Envoi...' : 'Envoyer mon avis' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.rating-page {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; background: #faf8f2; padding: 2rem;
}

.rating-card {
  background: #FCFAF5; border: 1.5px solid #e5e2d3;
  border-radius: 20px; padding: 2.5rem;
  width: 100%; max-width: 500px;
  box-shadow: 0 8px 40px rgba(81,95,55,0.08);
}

.card-logo { display: flex; justify-content: center; margin-bottom: 2rem; }
.card-logo img { height: 40px; }

/* States */
.state-center {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.75rem; padding: 2rem 0; color: #9ca3af; font-size: 0.875rem;
}
.spinner {
  width: 28px; height: 28px;
  border: 3px solid #e5e2d3; border-top-color: #515F37;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.state-screen { text-align: center; padding: 0.5rem 0; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
.state-screen h1 { font-size: 1.5rem; font-weight: 900; color: #1a1a0e; margin: 0; }
.state-screen p { color: #6b7280; font-size: 0.9rem; line-height: 1.6; margin: 0; max-width: 320px; }

.state-icon {
  width: 64px; height: 64px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.state-icon svg { width: 28px; height: 28px; }
.state-icon--success { background: #f0ede3; color: #515F37; }
.state-icon--error { background: #fee2e2; color: #dc2626; }

/* Form */
.form-header { margin-bottom: 1.75rem; }
.form-header h1 { font-size: 1.5rem; font-weight: 900; color: #1a1a0e; margin: 0 0 0.35rem; }
.form-header p { color: #9ca3af; font-size: 0.875rem; margin: 0; }

/* Criteria */
.criteria-list { display: flex; flex-direction: column; gap: 0; margin-bottom: 1.5rem; border: 1.5px solid #e5e2d3; border-radius: 12px; overflow: hidden; }

.criterion {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid #f0ede3;
}
.criterion:last-child { border-bottom: none; }

.criterion-label {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.875rem; font-weight: 600; color: #374151;
}
.criterion-icon { font-size: 1rem; }

/* Recommend */
.recommend-field { margin-bottom: 1.25rem; }
.field-label { display: block; font-size: 0.825rem; font-weight: 600; color: #374151; margin-bottom: 0.6rem; }
.optional { font-weight: 400; color: #9ca3af; }

.recommend-btns { display: flex; gap: 0.6rem; }
.rec-btn {
  display: flex; align-items: center; gap: 0.5rem;
  flex: 1; padding: 0.65rem 1rem;
  border: 1.5px solid #e5e2d3; border-radius: 10px;
  background: #FCFAF5; cursor: pointer; font-size: 0.875rem; font-weight: 600;
  color: #6b7280; transition: all 0.15s; justify-content: center;
}
.rec-btn svg { width: 15px; height: 15px; }
.rec-btn--yes.active { border-color: #515F37; background: #f0ede3; color: #515F37; }
.rec-btn--no.active { border-color: #fca5a5; background: #fee2e2; color: #dc2626; }
.rec-btn:hover:not(.active) { border-color: #d6cda4; }

/* Comment */
.comment-field { margin-bottom: 1.25rem; }
textarea {
  width: 100%;
  padding: 0.7rem 0.875rem;
  border: 1.5px solid #e5e2d3; border-radius: 10px;
  font-size: 0.9rem; font-family: inherit; color: #1a1a0e;
  background: #faf8f2; resize: vertical;
  transition: border-color 0.15s, background 0.15s;
}
textarea:focus { outline: none; border-color: #515F37; background: #FCFAF5; }
textarea::placeholder { color: #b5ae94; }

/* Warning */
.warning-msg {
  display: flex; align-items: center; gap: 0.5rem;
  background: #fff7ed; color: #ea580c;
  padding: 0.65rem 0.875rem; border-radius: 8px;
  font-size: 0.8rem; font-weight: 500; margin-bottom: 1rem;
}
.warning-msg svg { width: 15px; height: 15px; flex-shrink: 0; }

.btn-primary {
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  width: 100%; padding: 0.8rem;
  background: #515F37; color: #fff;
  border: none; border-radius: 10px;
  font-size: 0.95rem; font-weight: 700; cursor: pointer;
  transition: background 0.15s; text-decoration: none; text-align: center;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { background: #3d4a28; }
.btn-spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}

@media (max-width: 540px) {
  .rating-page { padding: 1rem; }
  .rating-card { padding: 1.5rem 1.25rem; border-radius: 16px; }
  .recommend-btns { flex-direction: column; }
}
</style>
