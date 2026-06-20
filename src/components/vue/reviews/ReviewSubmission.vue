<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../../services/api';

const props = defineProps<{ token: string }>();

interface Request {
  _id: string;
  prestataireId: string;
  desiredAt: string;
  prestations: string[];
}

const loading = ref(true);
const submitting = ref(false);
const error = ref('');
const success = ref(false);
const request = ref<Request | null>(null);

const form = ref({
  ratings: {
    time: 3,
    quality: 3,
    sympathy: 3,
    value: 3,
    punctuality: 3,
  },
  comment: '',
  recommend: true,
});

const CATEGORY_LABELS: Record<string, string> = {
  time: 'Délai',
  quality: 'Qualité',
  sympathy: 'Sympathie',
  value: 'Rapport qualité/prix',
  punctuality: 'Ponctualité',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  time: 'Avez-vous été servi à temps?',
  quality: 'Qualité du travail fourni',
  sympathy: 'Attitude et respect du professionnel',
  value: 'Tarif en rapport avec la prestation',
  punctuality: 'Ponctualité et respect des délais',
};

onMounted(async () => {
  if (!props.token) {
    error.value = 'Lien invalide';
    loading.value = false;
    return;
  }

  try {
    const { data } = await api.get(`/reviews/validate-token?token=${props.token}`);
    request.value = data.request;
  } catch (e) {
    error.value = 'Lien invalide ou expiré';
  } finally {
    loading.value = false;
  }
});

async function submitReview() {
  if (!form.value.ratings) {
    error.value = 'Veuillez noter le prestataire';
    return;
  }

  submitting.value = true;
  error.value = '';

  try {
    await api.post('/reviews/submit', {
      token: props.token,
      ratings: form.value.ratings,
      comment: form.value.comment || undefined,
      recommend: form.value.recommend,
    });
    success.value = true;
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Erreur lors de la soumission';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="review-container">
    <div v-if="loading" class="loading">Chargement…</div>
    <div v-else-if="error" class="error-card">
      <div class="error-icon">❌</div>
      <p>{{ error }}</p>
    </div>
    <div v-else-if="success" class="success-card">
      <div class="success-icon">✓</div>
      <h2>Merci pour votre avis!</h2>
      <p>Votre avis a été enregistré et sera affiché après modération.</p>
      <a href="/" class="btn-back">Retour à l'accueil</a>
    </div>
    <div v-else-if="request" class="review-card">
      <h1>Donnez votre avis</h1>
      <p class="intro">Partagez votre expérience avec ce prestataire</p>

      <form @submit.prevent="submitReview">
        <!-- Ratings -->
        <div class="ratings-section">
          <div v-for="(label, key) in CATEGORY_LABELS" :key="key" class="rating-group">
            <div class="rating-header">
              <label>{{ label }}</label>
              <span class="rating-desc">{{ CATEGORY_DESCRIPTIONS[key] }}</span>
            </div>
            <div class="rating-input">
              <div class="stars">
                <button
                  v-for="star in 5"
                  :key="star"
                  type="button"
                  class="star"
                  :class="{ active: star <= form.ratings[key as keyof typeof form.ratings] }"
                  @click="form.ratings[key as keyof typeof form.ratings] = star"
                >
                  ★
                </button>
              </div>
              <span class="rating-value">{{ form.ratings[key as keyof typeof form.ratings] }}/5</span>
            </div>
          </div>
        </div>

        <!-- Comment -->
        <div class="form-group">
          <label for="comment">Commentaire (optionnel)</label>
          <textarea
            id="comment"
            v-model="form.comment"
            placeholder="Partagez les détails de votre expérience..."
            rows="4"
            maxlength="1000"
          ></textarea>
          <div class="char-count">{{ form.comment.length }}/1000</div>
        </div>

        <!-- Recommend -->
        <div class="form-group">
          <label class="checkbox-label">
            <input v-model="form.recommend" type="checkbox" />
            <span>Je recommande ce prestataire</span>
          </label>
        </div>

        <!-- Error -->
        <div v-if="error" class="error-msg">{{ error }}</div>

        <!-- Submit -->
        <button type="submit" class="btn-submit" :disabled="submitting">
          {{ submitting ? 'Envoi…' : 'Soumettre mon avis' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.review-container {
  max-width: 600px;
  width: 100%;
  padding: 2rem;
}

.loading,
.error-card,
.success-card,
.review-card {
  background: #FCFAF5;
  border-radius: 20px;
  padding: 2.5rem 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.review-card {
  text-align: left;
}

.loading {
  color: #6b7280;
}

.error-icon,
.success-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-card p,
.success-card p {
  margin: 0;
  color: #6b7280;
  line-height: 1.6;
}

.error-card p {
  color: #b91c1c;
}

.success-card h2 {
  margin: 1rem 0 0.5rem;
  color: #1a1a0e;
}

.btn-back {
  display: inline-block;
  margin-top: 1.5rem;
  padding: 0.8rem 1.6rem;
  background: #3a5020;
  color: #fff;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: background 0.15s;
}

.btn-back:hover {
  background: #2a3c16;
}

.review-card h1 {
  margin: 0 0 0.5rem;
  font-size: 1.6rem;
  color: #1a1a0e;
}

.intro {
  margin: 0 0 2rem;
  color: #6b7280;
}

form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.ratings-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.rating-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rating-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.rating-header label {
  font-weight: 600;
  color: #1a1a0e;
}

.rating-desc {
  font-size: 0.8rem;
  color: #9ca3af;
}

.rating-input {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stars {
  display: flex;
  gap: 0.5rem;
}

.star {
  width: 40px;
  height: 40px;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
  color: #d1d5db;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.15s;
}

.star:hover {
  border-color: #fbbf24;
  color: #fbbf24;
}

.star.active {
  border-color: #fbbf24;
  color: #fbbf24;
  background: #fffbeb;
}

.rating-value {
  font-weight: 600;
  color: #3a5020;
  min-width: 45px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #1a1a0e;
}

textarea {
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.95rem;
  resize: vertical;
  transition: border-color 0.15s;
}

textarea:focus {
  outline: none;
  border-color: #3a5020;
  box-shadow: 0 0 0 3px rgba(58, 80, 32, 0.1);
}

.char-count {
  font-size: 0.75rem;
  color: #9ca3af;
  text-align: right;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-weight: 500;
  color: #374151;
}

.checkbox-label input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.error-msg {
  padding: 0.75rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #b91c1c;
  font-size: 0.9rem;
}

.btn-submit {
  padding: 0.9rem;
  background: #3a5020;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-submit:hover:not(:disabled) {
  background: #2a3c16;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
