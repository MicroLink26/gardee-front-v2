<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../../services/api';

interface Review {
  requesterPrenom: string;
  requesterNom: string;
  ratingDetails: {
    time: number;
    quality: number;
    sympathy: number;
    value: number;
    punctuality: number;
  };
  ratingComment?: string;
  recommend?: boolean;
  ratingGivenAt: string;
}

const props = defineProps<{ prestataireId: string }>();

const reviews = ref<Review[]>([]);
const loading = ref(true);
const error = ref('');
const page = ref(1);
const total = ref(0);
const pageSize = 10;

const CATEGORY_LABELS: Record<string, string> = {
  time: 'Délai',
  quality: 'Qualité',
  sympathy: 'Sympathie',
  value: 'Rapport qualité/prix',
  punctuality: 'Ponctualité',
};

onMounted(() => loadReviews());

async function loadReviews() {
  loading.value = true;
  error.value = '';
  try {
    const params = new URLSearchParams({
      page: page.value.toString(),
      pageSize: pageSize.toString(),
    });
    const { data } = await api.get(`/prestataires/${props.prestataireId}/reviews?${params}`);
    reviews.value = data.items || [];
    total.value = data.total || 0;
  } catch (e) {
    error.value = 'Erreur lors du chargement des avis';
  } finally {
    loading.value = false;
  }
}

function getAverageRating(details: Review['ratingDetails']): number {
  const values = Object.values(details);
  return parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
}
</script>

<template>
  <div class="reviews-section">
    <h2>Avis des clients</h2>

    <div v-if="loading" class="loading">Chargement des avis…</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="reviews.length === 0" class="empty">
      <p>Pas encore d'avis. Soyez le premier à laisser un avis!</p>
    </div>
    <div v-else class="reviews-list">
      <div v-for="review in reviews" :key="review.ratingGivenAt + review.requesterNom" class="review-card">
        <div class="review-header">
          <div class="reviewer-info">
            <h3>{{ review.requesterPrenom }} {{ review.requesterNom }}</h3>
            <p class="review-date">{{ formatDate(review.ratingGivenAt) }}</p>
          </div>
          <div class="review-rating">
            <div class="rating-value">{{ getAverageRating(review.ratingDetails) }}</div>
            <div class="stars">⭐⭐⭐⭐⭐</div>
          </div>
        </div>

        <div v-if="review.ratingComment" class="review-comment">
          {{ review.ratingComment }}
        </div>

        <div v-if="review.recommend !== undefined" class="review-recommend">
          <span v-if="review.recommend" class="recommend-badge positive">✓ Je recommande</span>
          <span v-else class="recommend-badge negative">✗ Je ne recommande pas</span>
        </div>

        <div class="rating-breakdown">
          <div v-for="(label, key) in CATEGORY_LABELS" :key="key" class="rating-item">
            <span class="rating-label">{{ label }}</span>
            <div class="rating-stars">
              <span v-for="i in 5" :key="i" :class="{ filled: i <= review.ratingDetails[key as keyof typeof review.ratingDetails] }">★</span>
            </div>
            <span class="rating-value">{{ review.ratingDetails[key as keyof typeof review.ratingDetails] }}/5</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="reviews.length > 0" class="pagination">
      <button :disabled="page === 1" @click="page--; loadReviews()">← Précédent</button>
      <span>Page {{ page }} sur {{ Math.ceil(total / pageSize) }}</span>
      <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++; loadReviews()">Suivant →</button>
    </div>
  </div>
</template>

<style scoped>
.reviews-section {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

.reviews-section h2 {
  margin: 0 0 1.5rem;
  font-size: 1.4rem;
  color: #1a1a0e;
}

.loading,
.error,
.empty {
  text-align: center;
  padding: 2rem 1rem;
  color: #6b7280;
}

.error {
  color: #b91c1c;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.review-card {
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f9fafb;
  transition: all 0.15s;
}

.review-card:hover {
  border-color: #d1d5db;
  background: #fff;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.reviewer-info h3 {
  margin: 0 0 0.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1a1a0e;
}

.review-date {
  margin: 0;
  font-size: 0.8rem;
  color: #9ca3af;
}

.review-rating {
  text-align: right;
  flex-shrink: 0;
}

.rating-value {
  font-size: 1.4rem;
  font-weight: bold;
  color: #3a5020;
  margin-bottom: 0.25rem;
}

.stars {
  font-size: 0.8rem;
  color: #fbbf24;
}

.review-comment {
  margin-bottom: 1rem;
  line-height: 1.6;
  color: #374151;
  font-style: italic;
}

.review-recommend {
  margin-bottom: 1.25rem;
}

.recommend-badge {
  display: inline-block;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}

.recommend-badge.positive {
  background: #dcfce7;
  color: #15803d;
}

.recommend-badge.negative {
  background: #fee2e2;
  color: #b91c1c;
}

.rating-breakdown {
  display: grid;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.rating-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
}

.rating-label {
  width: 120px;
  color: #6b7280;
  font-weight: 500;
}

.rating-stars {
  flex: 1;
  display: flex;
  gap: 2px;
}

.rating-stars span {
  font-size: 0.9rem;
  color: #d1d5db;
  transition: color 0.15s;
}

.rating-stars span.filled {
  color: #fbbf24;
}

.rating-value {
  width: 35px;
  text-align: right;
  color: #374151;
  font-weight: 500;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

.pagination button {
  padding: 0.6rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.15s;
}

.pagination button:hover:not(:disabled) {
  border-color: #3a5020;
  color: #3a5020;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination span {
  font-size: 0.875rem;
  color: #6b7280;
}
</style>
