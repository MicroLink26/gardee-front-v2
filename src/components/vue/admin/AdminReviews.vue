<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../../services/api';

interface PendingReview {
  _id: string;
  prestataireId: string;
  requesterPrenom?: string;
  requesterNom?: string;
  requesterEmail: string;
  ratingDetails?: Record<string, number>;
  ratingComment?: string;
  recommend?: boolean;
  ratingGivenAt?: string;
}

const reviews = ref<PendingReview[]>([]);
const loading = ref(true);
const actionLoading = ref<string | null>(null);

function avgRating(details?: Record<string, number>) {
  if (!details) return 0;
  const vals = Object.values(details).filter(v => typeof v === 'number');
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function stars(n: number) {
  const full = Math.round(n);
  return { full, empty: 5 - full };
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/admin/reviews/pending?pageSize=50');
    reviews.value = data.items;
  } finally {
    loading.value = false;
  }
}

async function approve(id: string) {
  actionLoading.value = id;
  try {
    await api.put(`/admin/reviews/${id}/approve`);
    reviews.value = reviews.value.filter(r => r._id !== id);
  } finally {
    actionLoading.value = null;
  }
}

async function reject(id: string) {
  actionLoading.value = id;
  try {
    await api.put(`/admin/reviews/${id}/reject`);
    reviews.value = reviews.value.filter(r => r._id !== id);
  } finally {
    actionLoading.value = null;
  }
}

onMounted(load);
</script>

<template>
  <div class="admin-reviews">
    <div class="page-header">
      <div>
        <p class="header-eyebrow">Administration</p>
        <h1>Avis en attente de modération</h1>
        <p class="header-sub">{{ reviews.length }} avis à examiner</p>
      </div>
    </div>

    <div v-if="loading" class="skeleton-list">
      <div v-for="i in 3" :key="i" class="skel" style="height:100px;border-radius:14px"></div>
    </div>

    <div v-else-if="!reviews.length" class="empty">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h3>Aucun avis en attente</h3>
      <p>Tous les avis ont été traités.</p>
    </div>

    <div v-else class="review-list">
      <div v-for="r in reviews" :key="r._id" class="review-card">
        <div class="review-meta">
          <span class="review-author">{{ r.requesterPrenom || r.requesterEmail }}</span>
          <span class="review-date">{{ formatDate(r.ratingGivenAt) }}</span>
          <div class="review-stars">
            <span class="sf" v-for="i in stars(avgRating(r.ratingDetails)).full" :key="`f${i}`">★</span>
            <span class="se" v-for="i in stars(avgRating(r.ratingDetails)).empty" :key="`e${i}`">★</span>
            <strong>{{ avgRating(r.ratingDetails).toFixed(1) }}</strong>
          </div>
          <span v-if="r.recommend" class="recommend-badge">Recommande</span>
        </div>

        <div v-if="r.ratingDetails" class="rating-details">
          <span v-for="(val, key) in r.ratingDetails" :key="key" class="detail-chip">
            {{ key }}: <strong>{{ val }}/5</strong>
          </span>
        </div>

        <p v-if="r.ratingComment" class="review-comment">{{ r.ratingComment }}</p>
        <p v-else class="review-no-comment">Pas de commentaire</p>

        <div class="review-actions">
          <button
            class="btn-reject"
            :disabled="actionLoading === r._id"
            @click="reject(r._id)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Rejeter
          </button>
          <button
            class="btn-approve"
            :disabled="actionLoading === r._id"
            @click="approve(r._id)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
            Publier
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.admin-reviews { display: flex; flex-direction: column; gap: 1.5rem; }

.page-header { padding-bottom: 1.5rem; border-bottom: 1px solid #e9e5d6; }
.header-eyebrow { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #a8c47a; margin: 0 0 0.35rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 900; color: #1a1a0e; margin: 0 0 0.2rem; }
.header-sub { font-size: 0.85rem; color: #9ca3af; margin: 0; }

.empty {
  text-align: center; padding: 4rem 2rem;
  display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
}
.empty-icon {
  width: 56px; height: 56px; border-radius: 50%;
  background: rgba(168,196,122,0.18); color: #3a5020;
  border: 2px solid rgba(168,196,122,0.3);
  display: flex; align-items: center; justify-content: center;
}
.empty-icon svg { width: 24px; height: 24px; }
.empty h3 { font-size: 1.1rem; font-weight: 700; color: #1a1a0e; margin: 0; }
.empty p { font-size: 0.875rem; color: #9ca3af; margin: 0; }

.review-list { display: flex; flex-direction: column; gap: 0.75rem; }

.review-card {
  background: #FCFAF5; border: 1.5px solid #e9e5d6; border-radius: 16px;
  padding: 1.125rem; display: flex; flex-direction: column; gap: 0.75rem;
}
.review-meta {
  display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
}
.review-author { font-size: 0.875rem; font-weight: 700; color: #1a1a0e; }
.review-date { font-size: 0.75rem; color: #9ca3af; }
.review-stars { display: flex; align-items: center; gap: 0.15rem; font-size: 0.85rem; }
.sf { color: #e6c553; }
.se { color: #ddd8c8; }
.review-stars strong { margin-left: 0.3rem; font-size: 0.85rem; color: #1a1a0e; }
.recommend-badge {
  background: rgba(58,80,32,0.1); color: #3a5020;
  border: 1px solid rgba(58,80,32,0.2);
  padding: 0.15rem 0.5rem; border-radius: 999px;
  font-size: 0.7rem; font-weight: 600;
}
.rating-details { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.detail-chip {
  background: #f0ede3; color: #515F37; border: 1px solid #d6cda4;
  padding: 0.15rem 0.55rem; border-radius: 999px;
  font-size: 0.72rem;
}
.review-comment { font-size: 0.875rem; color: #374151; line-height: 1.65; margin: 0; font-style: italic; }
.review-no-comment { font-size: 0.8rem; color: #9ca3af; margin: 0; }
.review-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }

.btn-reject {
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.45rem 0.875rem;
  background: #fff1f2; color: #b91c1c;
  border: 1.5px solid #fecaca; border-radius: 8px;
  cursor: pointer; font-weight: 600; font-size: 0.8rem; font-family: inherit;
  transition: all 0.15s;
}
.btn-reject:hover { background: #fee2e2; }
.btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-approve {
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.45rem 1rem;
  background: #3a5020; color: #fff;
  border: none; border-radius: 8px;
  cursor: pointer; font-weight: 700; font-size: 0.8rem; font-family: inherit;
  transition: background 0.15s;
}
.btn-approve:hover { background: #253515; }
.btn-approve:disabled { opacity: 0.5; cursor: not-allowed; }

.skeleton-list { display: flex; flex-direction: column; gap: 0.75rem; }
.skel {
  background: linear-gradient(90deg, #f3f0e8 25%, #ebe8de 50%, #f3f0e8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
