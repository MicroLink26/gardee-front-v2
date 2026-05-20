<script setup lang="ts">
import type { User } from '../../types';
import { getAvatar } from '../../composables/useAvatar';

defineProps<{ user: User }>();

function stars(rating: number) {
  const full = Math.round(rating);
  return { full, empty: 5 - full };
}
</script>

<template>
  <a :href="`/prestataires/?id=${user._id}`" class="card">
    <div class="card-photo">
      <img
        :src="getAvatar(user._id, user.profil_image?.secure_url)"
        :alt="`${user.prenom} ${user.nom}`"
        loading="lazy"
      />
      <span v-if="user.tarifHoraire" class="card-price">{{ user.tarifHoraire }} €/h</span>
    </div>

    <div class="card-body">
      <h3 class="card-name">{{ user.prenom }} {{ user.nom }}</h3>
      <p class="card-ville">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg>
        {{ user.ville }}
      </p>

      <div v-if="user.numberOfReviews > 0" class="card-rating">
        <span class="stars-full"><span v-for="i in stars(user.averageRating).full" :key="`f${i}`">★</span></span>
        <span class="stars-empty"><span v-for="i in stars(user.averageRating).empty" :key="`e${i}`">★</span></span>
        <span class="rating-val">{{ user.averageRating.toFixed(1) }}</span>
        <span class="rating-count">({{ user.numberOfReviews }})</span>
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
* { box-sizing: border-box; }

.card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  border: 1.5px solid #e5e2d3;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
  color: inherit;
}
.card:hover {
  box-shadow: 0 12px 36px rgba(81,95,55,0.12);
  transform: translateY(-3px);
  border-color: #d6cda4;
}

.card-photo {
  position: relative;
  height: 190px;
  background: linear-gradient(135deg, #eae8de, #d6cda4);
  overflow: hidden;
  flex-shrink: 0;
}
.card-photo img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.card:hover .card-photo img { transform: scale(1.04); }

.card-initials {
  height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 2.5rem; font-weight: 900; color: #515F37;
}

.card-price {
  position: absolute; bottom: 10px; right: 10px;
  background: rgba(26,26,14,0.85); color: #d6cda4;
  padding: 0.25rem 0.65rem; border-radius: 999px;
  font-size: 0.78rem; font-weight: 700;
  backdrop-filter: blur(4px);
}

.card-body { padding: 1rem; display: flex; flex-direction: column; gap: 0.55rem; flex: 1; }

.card-name { font-size: 1rem; font-weight: 800; margin: 0; color: #1a1a0e; }

.card-ville {
  display: flex; align-items: center; gap: 0.3rem;
  color: #9ca3af; font-size: 0.82rem; margin: 0;
}
.card-ville svg { width: 12px; height: 12px; flex-shrink: 0; }

.card-rating { display: flex; align-items: center; gap: 1px; }
.stars-full { color: #e6c553; font-size: 0.85rem; }
.stars-empty { color: #e5e2d3; font-size: 0.85rem; }
.rating-val { font-size: 0.82rem; font-weight: 700; color: #1a1a0e; margin-left: 0.25rem; }
.rating-count { font-size: 0.75rem; color: #9ca3af; }

.card-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.tag {
  background: #f0ede3; color: #515F37;
  border: 1px solid #d6cda4;
  padding: 0.18rem 0.55rem; border-radius: 999px;
  font-size: 0.72rem; font-weight: 600;
}

.card-footer { margin-top: auto; padding-top: 0.6rem; border-top: 1px solid #f0ede3; }
.card-cta { font-size: 0.82rem; font-weight: 700; color: #9ca3af; transition: color 0.15s; }
.card:hover .card-cta { color: #515F37; }
</style>
