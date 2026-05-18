<script setup lang="ts">
import type { User } from '../../types';

defineProps<{ user: User }>();

function stars(rating: number) {
  const full = Math.round(rating);
  return { full, empty: 5 - full };
}
</script>

<template>
  <a :href="`/prestataires/${user._id}`" class="card">
    <div class="card-photo">
      <img
        v-if="user.profil_image?.secure_url"
        :src="user.profil_image.secure_url"
        :alt="`${user.prenom} ${user.nom}`"
        loading="lazy"
      />
      <div v-else class="card-photo-placeholder">
        {{ user.prenom[0] }}{{ user.nom[0] }}
      </div>
      <span v-if="user.tarifHoraire" class="card-price">{{ user.tarifHoraire }} €/h</span>
    </div>

    <div class="card-body">
      <div class="card-header">
        <h3 class="card-name">{{ user.prenom }} {{ user.nom }}</h3>
        <p class="card-ville">📍 {{ user.ville }}</p>
      </div>

      <div v-if="user.numberOfReviews > 0" class="card-rating">
        <span class="stars">
          <span v-for="i in stars(user.averageRating).full" :key="`f${i}`" class="star full">★</span>
          <span v-for="i in stars(user.averageRating).empty" :key="`e${i}`" class="star empty">★</span>
        </span>
        <span class="rating-val">{{ user.averageRating.toFixed(1) }}</span>
        <span class="rating-count">({{ user.numberOfReviews }} avis)</span>
      </div>

      <div class="card-tags">
        <span v-for="p in user.prestations.slice(0, 3)" :key="p" class="tag">{{ p }}</span>
      </div>

      <div class="card-footer">
        <span class="card-cta">Voir le profil →</span>
      </div>
    </div>
  </a>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
  transition: box-shadow 0.2s, transform 0.2s;
  color: inherit;
}
.card:hover {
  box-shadow: 0 10px 32px rgba(0,0,0,0.1);
  transform: translateY(-3px);
  border-color: #d1fae5;
}

/* Photo */
.card-photo { position: relative; height: 190px; background: linear-gradient(135deg, #d1fae5, #a7f3d0); overflow: hidden; flex-shrink: 0; }
.card-photo img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.card:hover .card-photo img { transform: scale(1.04); }
.card-photo-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 800;
  color: #065f46;
}
.card-price {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: #111827;
  color: #fff;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
}

/* Body */
.card-body { padding: 1rem; display: flex; flex-direction: column; gap: 0.6rem; flex: 1; }
.card-header {}
.card-name { font-size: 1rem; font-weight: 700; margin: 0 0 0.2rem; color: #111827; }
.card-ville { color: #6b7280; font-size: 0.85rem; margin: 0; }

/* Rating */
.card-rating { display: flex; align-items: center; gap: 0.3rem; }
.stars { display: flex; gap: 1px; }
.star { font-size: 0.85rem; }
.star.full { color: #f59e0b; }
.star.empty { color: #e5e7eb; }
.rating-val { font-size: 0.85rem; font-weight: 700; color: #111827; }
.rating-count { font-size: 0.78rem; color: #9ca3af; }

/* Tags */
.card-tags { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.tag {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #d1fae5;
  padding: 0.18rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Footer */
.card-footer { margin-top: auto; padding-top: 0.5rem; border-top: 1px solid #f3f4f6; }
.card-cta { font-size: 0.85rem; font-weight: 600; color: #16a34a; }
.card:hover .card-cta { text-decoration: underline; }
</style>
