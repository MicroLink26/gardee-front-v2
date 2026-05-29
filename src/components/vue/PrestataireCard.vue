<script setup lang="ts">
import type { User } from '../../types';
import { getAvatar } from '../../composables/useAvatar';
import { useCategoryName } from '../../composables/useCategoryName';

defineProps<{ user: User }>();

const { categoryName } = useCategoryName();

function stars(rating: number) {
  const full = Math.round(rating);
  return { full, empty: 5 - full };
}
</script>

<template>
  <a :href="`/prestataires/${user._id}/`" class="card">
    <div class="card-photo">
      <img
        :src="getAvatar(user._id, user.profil_image?.secure_url)"
        :alt="`${user.prenom} ${user.nom}`"
        loading="lazy"
      />
      <div class="photo-overlay"></div>
      <span v-if="user.tarifHoraire" class="card-price">{{ user.tarifHoraire }} €/h</span>
      <div class="card-identity">
        <h3 class="card-name">{{ user.prenom }} {{ user.nom }}</h3>
        <p class="card-ville">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="10" height="10"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg>
          {{ user.ville }}
        </p>
      </div>
    </div>

    <div class="card-body">
      <div v-if="user.numberOfReviews > 0" class="card-rating">
        <div class="stars">
          <span class="stars-full"><span v-for="i in stars(user.averageRating).full" :key="`f${i}`">★</span></span>
          <span class="stars-empty"><span v-for="i in stars(user.averageRating).empty" :key="`e${i}`">★</span></span>
        </div>
        <span class="rating-val">{{ user.averageRating.toFixed(1) }}</span>
        <span class="rating-count">{{ user.numberOfReviews }} avis</span>
      </div>
      <div v-else class="card-rating">
        <span class="new-badge">Nouveau</span>
      </div>

      <div class="card-tags">
        <span v-for="p in user.prestations.slice(0, 3)" :key="p" class="tag">{{ categoryName(p) }}</span>
      </div>
    </div>

    <div class="card-footer">
      <span class="card-cta">
        Voir le profil
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg>
      </span>
    </div>
  </a>
</template>

<style scoped>
* { box-sizing: border-box; }

.card {
  display: flex; flex-direction: column;
  text-decoration: none;
  border: 1.5px solid #e5e2d3;
  border-radius: 20px; overflow: hidden;
  background: #FCFAF5;
  transition: box-shadow 0.22s, transform 0.22s, border-color 0.2s;
  color: inherit;
}
.card:hover {
  box-shadow: 0 20px 50px rgba(81,95,55,0.16);
  transform: translateY(-6px);
  border-color: #a8c47a;
}

/* Photo */
.card-photo {
  position: relative; height: 210px;
  background: linear-gradient(135deg, #dde6c8 0%, #c8d9a6 100%);
  overflow: hidden; flex-shrink: 0;
}
.card-photo img {
  width: 100%; height: 100%; object-fit: cover;
  transition: transform 0.4s ease;
}
.card:hover .card-photo img { transform: scale(1.07); }

.photo-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.72) 100%);
  pointer-events: none;
}

.card-price {
  position: absolute; top: 10px; right: 10px; z-index: 1;
  background: rgba(20,35,26,0.88); color: #d6cda4;
  padding: 0.28rem 0.72rem; border-radius: 999px;
  font-size: 0.75rem; font-weight: 700;
  backdrop-filter: blur(4px);
}

.card-identity {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 0.875rem 1rem 0.8rem; z-index: 1;
}
.card-name {
  font-size: 1rem; font-weight: 800; color: #fff; margin: 0 0 0.18rem;
  letter-spacing: -0.01em; text-shadow: 0 1px 6px rgba(0,0,0,0.25);
}
.card-ville {
  display: flex; align-items: center; gap: 0.28rem;
  color: rgba(255,255,255,0.8); font-size: 0.76rem; margin: 0;
}

/* Body */
.card-body {
  padding: 0.875rem 1rem 0;
  display: flex; flex-direction: column; gap: 0.55rem; flex: 1;
}

.card-rating { display: flex; align-items: center; gap: 0.4rem; }
.stars { display: flex; }
.stars-full { color: #e6c553; font-size: 0.85rem; letter-spacing: -1px; }
.stars-empty { color: #e0dbd0; font-size: 0.85rem; letter-spacing: -1px; }
.rating-val { font-size: 0.85rem; font-weight: 800; color: #1a1a0e; }
.rating-count { font-size: 0.75rem; color: #9ca3af; }

.new-badge {
  font-size: 0.72rem; font-weight: 700; color: #515F37;
  background: rgba(81,95,55,0.08); border: 1px solid rgba(81,95,55,0.18);
  border-radius: 999px; padding: 0.15rem 0.65rem;
}

.card-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.tag {
  background: #f0ede3; color: #515F37; border: 1px solid #e0d8c2;
  padding: 0.18rem 0.55rem; border-radius: 999px;
  font-size: 0.7rem; font-weight: 600; white-space: nowrap;
  max-width: 120px; overflow: hidden; text-overflow: ellipsis;
}

/* Footer */
.card-footer {
  padding: 0.75rem 1rem; margin-top: 0.875rem;
  border-top: 1px solid #f0ede3;
}
.card-cta {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 0.8rem; font-weight: 700; color: #515F37;
  transition: color 0.15s;
}
.card-cta svg { transition: transform 0.15s; }
.card:hover .card-cta { color: #2d3d1c; }
.card:hover .card-cta svg { transform: translateX(4px); }
</style>
