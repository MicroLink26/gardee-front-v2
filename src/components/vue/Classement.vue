<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { getRanking } from '../../services/users';
import { useCategoriesStore } from '../../stores/categories';
import { getAvatar } from '../../composables/useAvatar';
import type { User } from '../../types';

const users = ref<User[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 12;
const prestation = ref('');
const ville = ref('');
const minRating = ref(0);
const maxTarif = ref(200);
const sortBy = ref<'rating' | 'price' | 'reviews'>('rating');
const loading = ref(false);

const totalPages = computed(() => Math.ceil(total.value / pageSize));
const resultsRef = ref<HTMLElement | null>(null);

const categoriesStore = useCategoriesStore();
const RATINGS = [
  { label: 'Toutes', val: 0 },
  { label: '3+', val: 3 },
  { label: '4+', val: 4 },
  { label: '4.5+', val: 4.5 },
];

const filtered = computed(() => {
  let list = users.value.filter(u => {
    if (minRating.value > 0 && u.averageRating < minRating.value) return false;
    if (u.tarifHoraire && u.tarifHoraire > maxTarif.value) return false;
    return true;
  });
  if (sortBy.value === 'price') list = [...list].sort((a, b) => (a.tarifHoraire ?? 999) - (b.tarifHoraire ?? 999));
  else if (sortBy.value === 'reviews') list = [...list].sort((a, b) => (b.numberOfReviews ?? 0) - (a.numberOfReviews ?? 0));
  return list;
});

const podiumOrder = computed(() => {
  const top3 = filtered.value.slice(0, 3);
  if (top3.length < 3) return top3;
  return [top3[1], top3[0], top3[2]];
});

const showPodium = computed(() => page.value === 1 && filtered.value.length >= 3);

const listItems = computed(() =>
  showPodium.value ? filtered.value.slice(3) : filtered.value
);

const listRankStart = computed(() =>
  showPodium.value ? 4 : rankOffset.value + 1
);

const rankOffset = computed(() => (page.value - 1) * pageSize);

const carteUrl = computed(() => {
  const params = new URLSearchParams();
  if (ville.value) params.set('ville', ville.value);
  if (prestation.value) params.set('service', prestation.value);
  return `/carte${params.toString() ? '?' + params.toString() : ''}`;
});

async function load() {
  loading.value = true;
  try {
    const data = await getRanking({
      prestation: prestation.value || undefined,
      ville: ville.value || undefined,
      page: page.value,
      pageSize,
    });
    users.value = data.items;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

function search() {
  page.value = 1;
  load();
}

function toggleService(s: string) {
  prestation.value = prestation.value === s ? '' : s;
  search();
}

async function goPage(p: number) {
  page.value = p;
  await load();
  await nextTick();
  resultsRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetFilters() {
  prestation.value = '';
  ville.value = '';
  minRating.value = 0;
  maxTarif.value = 200;
  sortBy.value = 'rating';
  search();
}

onMounted(() => {
  categoriesStore.load();
  const q = new URLSearchParams(window.location.search).get('q');
  if (q) prestation.value = q;
  load();
});

const PODIUM_RANK = [2, 1, 3];

function podiumClass(podiumIndex: number) {
  const rank = PODIUM_RANK[podiumIndex];
  if (rank === 1) return 'medal-gold';
  if (rank === 2) return 'medal-silver';
  return 'medal-bronze';
}

function podiumMedal(podiumIndex: number) {
  const rank = PODIUM_RANK[podiumIndex];
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  return '🥉';
}

function stars(n: number) {
  return { full: Math.round(n), empty: 5 - Math.round(n) };
}
</script>

<template>
  <div class="classement-page">

    <!-- Hero -->
    <div class="page-hero">
      <div class="container">
        <div class="hero-content">
          <span class="eyebrow">Classement 2025</span>
          <h1>Les meilleurs jardiniers</h1>
          <p>Découvrez les prestataires les mieux notés près de chez vous</p>
        </div>

        <div class="filters-panel">
          <!-- Search row -->
          <div class="search-row">
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input
                v-model="ville"
                type="text"
                placeholder="Ville ou code postal..."
                class="text-input"
                @keyup.enter="search"
              />
            </div>
            <button class="search-btn" @click="search">Rechercher</button>
            <a :href="carteUrl" class="map-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
              Voir sur la carte
            </a>
          </div>

          <!-- Service chips -->
          <div class="chip-group">
            <button
              v-for="cat in categoriesStore.categories" :key="cat._id"
              :class="['chip', { active: prestation === cat._id }]"
              @click="toggleService(cat._id)"
              type="button"
            >{{ cat.name }}</button>
          </div>

          <!-- Rating + Price + Sort -->
          <div class="filter-row">
            <div class="filter-block">
              <span class="filter-label">Note minimum</span>
              <div class="rating-group">
                <button
                  v-for="r in RATINGS" :key="r.val"
                  :class="['rating-btn', { active: minRating === r.val }]"
                  @click="minRating = r.val"
                >{{ r.label }}</button>
              </div>
            </div>
            <div class="filter-block">
              <span class="filter-label">Tarif max : <strong>{{ maxTarif === 200 ? 'Tous' : maxTarif + ' €/h' }}</strong></span>
              <input type="range" v-model.number="maxTarif" min="15" max="200" step="5" class="range-input" />
            </div>
            <div class="filter-block">
              <span class="filter-label">Trier par</span>
              <div class="rating-group">
                <button :class="['rating-btn', { active: sortBy === 'rating' }]" @click="sortBy = 'rating'">Note</button>
                <button :class="['rating-btn', { active: sortBy === 'price' }]" @click="sortBy = 'price'">Prix</button>
                <button :class="['rating-btn', { active: sortBy === 'reviews' }]" @click="sortBy = 'reviews'">Avis</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div ref="resultsRef" class="container main-content">

      <!-- Results meta -->
      <div class="results-meta">
        <span v-if="loading" class="meta-loading">
          <span class="spinner"></span> Chargement...
        </span>
        <template v-else>
          <span class="meta-count">
            <strong>{{ filtered.length }}</strong> prestataire{{ filtered.length > 1 ? 's' : '' }}
            <template v-if="prestation"> · {{ prestation }}</template>
            <template v-if="ville"> · {{ ville }}</template>
          </span>
          <button
            v-if="prestation || ville || minRating > 0 || maxTarif < 200"
            class="reset-btn"
            @click="resetFilters"
          >Réinitialiser les filtres ×</button>
        </template>
      </div>

      <!-- Skeleton -->
      <template v-if="loading">
        <div class="podium-grid">
          <div v-for="i in 3" :key="i" class="podium-card skeleton-card">
            <div class="skeleton" style="height:260px;border-radius:16px 16px 0 0"></div>
            <div style="padding:1rem;display:flex;flex-direction:column;gap:0.5rem">
              <div class="skeleton" style="height:14px;width:60%;border-radius:4px"></div>
              <div class="skeleton" style="height:12px;width:40%;border-radius:4px"></div>
            </div>
          </div>
        </div>
        <div class="grid">
          <div v-for="i in 6" :key="i" class="skeleton-card">
            <div class="skeleton" style="height:80px;border-radius:14px"></div>
          </div>
        </div>
      </template>

      <template v-else>
        <!-- Empty -->
        <div v-if="!filtered.length" class="empty">
          <img src="/arbreUtiliser.png" alt="" style="height:120px;opacity:0.6;margin-bottom:1rem;" />
          <h3>Aucun jardinier trouvé</h3>
          <p>Essayez d'autres filtres ou une autre ville</p>
          <button class="btn-primary" @click="resetFilters">Voir tous les jardiniers</button>
        </div>

        <template v-else>
          <!-- Podium top 3 -->
          <div v-if="showPodium" class="podium-section">
            <h2 class="section-title">Podium</h2>
            <div class="podium-grid">
              <a
                v-for="(user, i) in podiumOrder"
                :key="user._id"
                :href="`/prestataires/?id=${user._id}`"
                :class="['podium-card', podiumClass(i), { 'podium-first': PODIUM_RANK[i] === 1 }]"
              >
                <div class="podium-rank-label">
                  <span class="podium-medal">{{ podiumMedal(i) }}</span>
                  <span class="podium-position">#{{ PODIUM_RANK[i] }}</span>
                </div>
                <div class="podium-photo">
                  <img :src="getAvatar(user._id, user.profil_image?.secure_url)" :alt="`${user.prenom} ${user.nom}`" loading="lazy" />
                  <span v-if="user.tarifHoraire" class="price-badge">{{ user.tarifHoraire }} €/h</span>
                </div>
                <div class="podium-body">
                  <h3>{{ user.prenom }} {{ user.nom }}</h3>
                  <p class="podium-ville">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;flex-shrink:0"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    {{ user.ville }}
                  </p>
                  <div v-if="user.numberOfReviews > 0" class="podium-rating">
                    <span class="stars-full"><span v-for="j in stars(user.averageRating).full" :key="`f${j}`">★</span></span>
                    <span class="stars-empty"><span v-for="j in stars(user.averageRating).empty" :key="`e${j}`">★</span></span>
                    <span class="rating-val">{{ user.averageRating.toFixed(1) }}</span>
                    <span class="rating-count">({{ user.numberOfReviews }} avis)</span>
                  </div>
                  <div v-else class="podium-rating">
                    <span class="no-rating">Nouveau</span>
                  </div>
                  <div class="podium-tags">
                    <span v-for="p in user.prestations.slice(0, 2)" :key="p" class="tag">{{ p }}</span>
                  </div>
                </div>
              </a>
            </div>
          </div>

          <!-- Rest of ranking -->
          <div v-if="listItems.length > 0">
            <h2 class="section-title" style="margin-top:2rem">
              {{ showPodium ? 'Suite du classement' : page > 1 ? `Page ${page}` : 'Classement' }}
            </h2>
          </div>
          <div class="grid">
            <a
              v-for="(user, i) in listItems"
              :key="user._id"
              :href="`/prestataires/?id=${user._id}`"
              class="rank-card"
            >
              <span class="rank-num">{{ listRankStart + i }}</span>
              <div class="rank-photo">
                <img :src="getAvatar(user._id, user.profil_image?.secure_url)" :alt="`${user.prenom} ${user.nom}`" loading="lazy" />
              </div>
              <div class="rank-body">
                <div class="rank-name">{{ user.prenom }} {{ user.nom }}</div>
                <div class="rank-ville">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;flex-shrink:0"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  {{ user.ville }}
                </div>
                <div v-if="user.numberOfReviews > 0" class="rank-rating">
                  <span class="stars-full"><span v-for="j in stars(user.averageRating).full" :key="`f${j}`">★</span></span>
                  <span class="stars-empty"><span v-for="j in stars(user.averageRating).empty" :key="`e${j}`">★</span></span>
                  <span class="rating-val-sm">{{ user.averageRating.toFixed(1) }}</span>
                  <span class="rating-count-sm">({{ user.numberOfReviews }})</span>
                </div>
                <div class="rank-tags">
                  <span v-for="p in user.prestations.slice(0, 2)" :key="p" class="tag-sm">{{ p }}</span>
                </div>
              </div>
              <div class="rank-right">
                <span v-if="user.tarifHoraire" class="rank-price">{{ user.tarifHoraire }} €/h</span>
                <span class="rank-cta">Voir le profil →</span>
              </div>
            </a>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="pagination">
            <button class="page-btn" :disabled="page === 1" @click="goPage(page - 1)">← Précédent</button>
            <div class="page-nums">
              <button
                v-for="p in totalPages"
                :key="p"
                :class="['page-num', { active: p === page }]"
                @click="goPage(p)"
              >{{ p }}</button>
            </div>
            <button class="page-btn" :disabled="page === totalPages" @click="goPage(page + 1)">Suivant →</button>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.classement-page { background: #faf8f2; min-height: 100vh; }
.container { max-width: 1100px; margin: 0 auto; padding: 0 2rem; }

/* ── HERO ── */
.page-hero {
  background: linear-gradient(160deg, #515F37 0%, #3d4a28 100%);
  padding: 2.5rem 0 2rem;
}

.hero-content { margin-bottom: 1.75rem; }

.eyebrow {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #d6cda4;
  background: rgba(214, 205, 164, 0.15);
  border: 1px solid rgba(214, 205, 164, 0.3);
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  margin-bottom: 0.75rem;
}

h1 { font-size: 2.25rem; font-weight: 900; color: #fff; margin: 0 0 0.4rem; letter-spacing: -0.02em; }
.hero-content p { color: rgba(255,255,255,0.7); font-size: 1rem; }

/* Filters panel */
.filters-panel {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  backdrop-filter: blur(8px);
}

.search-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }

.input-wrap {
  position: relative;
  flex: 1;
  min-width: 200px;
  max-width: 340px;
}
.input-icon {
  position: absolute;
  left: 0.75rem; top: 50%;
  transform: translateY(-50%);
  width: 16px; height: 16px;
  color: #9ca3af;
  pointer-events: none;
}
.text-input {
  width: 100%;
  padding: 0.6rem 0.875rem 0.6rem 2.25rem;
  border: 1.5px solid rgba(255,255,255,0.2);
  border-radius: 10px;
  font-size: 0.9rem;
  outline: none;
  background: rgba(255,255,255,0.95);
  color: #1a1a0e;
  transition: border-color 0.15s;
}
.text-input:focus { border-color: #d6cda4; }
.text-input::placeholder { color: #9ca3af; }

.search-btn {
  padding: 0.6rem 1.25rem;
  background: #d6cda4;
  color: #1a1a0e;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.search-btn:hover { background: #c4ba8e; }

.map-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.1rem;
  background: transparent;
  color: #d6cda4;
  border: 1.5px solid rgba(214, 205, 164, 0.5);
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s;
  white-space: nowrap;
}
.map-btn svg { width: 15px; height: 15px; }
.map-btn:hover { background: rgba(214, 205, 164, 0.15); border-color: #d6cda4; }

.chip-group { display: flex; flex-wrap: wrap; gap: 0.35rem; }

.chip {
  padding: 0.3rem 0.8rem;
  border: 1.5px solid rgba(255,255,255,0.2);
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.8);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.chip:hover { border-color: #d6cda4; color: #d6cda4; }
.chip.active { background: #d6cda4; border-color: #d6cda4; color: #1a1a0e; font-weight: 700; }

.filter-row {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  align-items: flex-start;
}

.filter-block { display: flex; flex-direction: column; gap: 0.4rem; }

.filter-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255,255,255,0.6);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.filter-label strong { color: #d6cda4; font-weight: 700; }

.rating-group { display: flex; gap: 0.35rem; }

.rating-btn {
  padding: 0.28rem 0.7rem;
  border: 1.5px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.8);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.rating-btn:hover { border-color: #d6cda4; color: #d6cda4; }
.rating-btn.active { background: #d6cda4; border-color: #d6cda4; color: #1a1a0e; }

.range-input {
  width: 160px;
  accent-color: #d6cda4;
  cursor: pointer;
}

/* ── MAIN ── */
.main-content { padding-top: 1.75rem; padding-bottom: 4rem; }

.results-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  min-height: 28px;
}

.meta-count { font-size: 0.875rem; color: #515F37; }
.meta-count strong { font-weight: 700; }

.meta-loading { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #6b7280; }

.spinner {
  width: 14px; height: 14px;
  border: 2px solid #e5e7eb;
  border-top-color: #515F37;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

.reset-btn {
  font-size: 0.78rem; color: #515F37;
  background: none; border: 1.5px solid #d6cda4;
  border-radius: 999px; padding: 0.3rem 0.9rem;
  cursor: pointer; transition: all 0.15s;
}
.reset-btn:hover { background: #d6cda4; }

/* ── SECTION TITLE ── */
.section-title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #515F37;
  margin: 0 0 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e2d3;
}

/* ── EMPTY ── */
.empty { text-align: center; padding: 5rem 2rem; }
.empty h3 { font-size: 1.25rem; font-weight: 700; color: #1a1a0e; margin-bottom: 0.5rem; }
.empty p { color: #6b7280; margin-bottom: 1.5rem; }
.btn-primary {
  padding: 0.7rem 1.75rem; background: #515F37; color: #fff;
  border: none; border-radius: 10px; font-weight: 700; cursor: pointer;
  transition: background 0.15s;
}
.btn-primary:hover { background: #3d4a28; }

/* ── PODIUM ── */
.podium-section { margin-bottom: 2rem; }

.podium-grid {
  display: grid;
  grid-template-columns: 1fr 1.12fr 1fr;
  gap: 1rem;
  align-items: end;
}

.podium-card {
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  border: 2px solid #e5e2d3;
  background: #fff;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}

.podium-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 48px rgba(81,95,55,0.15);
}

.podium-card.medal-gold  { border-color: #e6c553; box-shadow: 0 4px 20px rgba(230,197,83,0.2); }
.podium-card.medal-silver { border-color: #b0b8c1; }
.podium-card.medal-bronze { border-color: #c98a3e; }

.podium-card.podium-first {
  border-color: #e6c553;
  box-shadow: 0 6px 32px rgba(230,197,83,0.3);
}

.podium-rank-label {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  z-index: 2;
}

.podium-medal { font-size: 1.6rem; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25)); }

.podium-position {
  font-size: 0.72rem;
  font-weight: 800;
  color: rgba(0,0,0,0.5);
  background: rgba(255,255,255,0.9);
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
}

.podium-photo {
  position: relative;
  height: 180px;
  background: linear-gradient(135deg, #eae8de 0%, #d6cda4 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.podium-first .podium-photo { height: 210px; }

.podium-photo img {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  object-fit: cover;
  object-position: center top;
  border: 4px solid rgba(255,255,255,0.9);
  box-shadow: 0 4px 20px rgba(0,0,0,0.18);
  transition: transform 0.3s;
  flex-shrink: 0;
}
.podium-first .podium-photo img {
  width: 130px;
  height: 130px;
}
.podium-card:hover .podium-photo img { transform: scale(1.06); }

.podium-initials {
  width: 110px; height: 110px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 900;
  color: #515F37;
  background: rgba(255,255,255,0.6);
}

.price-badge {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(26,26,14,0.85);
  color: #d6cda4;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  backdrop-filter: blur(4px);
}

.podium-body { padding: 1.125rem; flex: 1; }
.podium-body h3 { font-size: 1.05rem; font-weight: 800; margin: 0 0 0.25rem; color: #1a1a0e; }

.podium-ville {
  display: flex; align-items: center; gap: 0.3rem;
  font-size: 0.8rem; color: #9ca3af; margin: 0 0 0.5rem;
}

.podium-rating {
  display: flex; align-items: center; gap: 0.2rem;
  font-size: 0.875rem; margin-bottom: 0.6rem;
}

.stars-full { color: #e6c553; }
.stars-empty { color: #e5e2d3; }
.rating-val { font-weight: 700; font-size: 0.875rem; color: #1a1a0e; margin-left: 0.2rem; }
.rating-count { font-size: 0.78rem; color: #9ca3af; }
.no-rating { font-size: 0.75rem; color: #9ca3af; font-style: italic; }

.podium-tags { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.tag {
  background: #f0ede3;
  color: #515F37;
  border: 1px solid #d6cda4;
  padding: 0.18rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* ── RANK GRID ── */
.grid {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.rank-card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1.125rem;
  background: #fff;
  border: 1.5px solid #e5e2d3;
  border-radius: 14px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.rank-card:hover {
  border-color: #d6cda4;
  box-shadow: 0 4px 16px rgba(81,95,55,0.08);
  transform: translateX(3px);
}

.rank-num {
  font-size: 0.8rem;
  font-weight: 800;
  color: #c8c4b4;
  width: 28px;
  text-align: center;
  flex-shrink: 0;
}

.rank-photo {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, #eae8de, #d6cda4);
}
.rank-photo img { width: 100%; height: 100%; object-fit: cover; }

.rank-initials {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem; font-weight: 800; color: #515F37;
}

.rank-body { flex: 1; min-width: 0; }
.rank-name { font-size: 0.9rem; font-weight: 700; color: #1a1a0e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.rank-ville {
  display: flex; align-items: center; gap: 0.25rem;
  font-size: 0.75rem; color: #9ca3af; margin-top: 0.1rem;
}

.rank-rating { display: flex; align-items: center; gap: 1px; margin-top: 0.3rem; }
.rating-val-sm { font-size: 0.72rem; font-weight: 700; color: #515F37; margin-left: 0.2rem; }
.rating-count-sm { font-size: 0.68rem; color: #9ca3af; }

.rank-tags { display: flex; gap: 0.25rem; margin-top: 0.35rem; }
.tag-sm {
  background: #f0ede3;
  color: #515F37;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 600;
  border: 1px solid #d6cda4;
}

.rank-right {
  display: flex; flex-direction: column;
  align-items: flex-end; gap: 0.4rem;
  flex-shrink: 0;
}

.rank-price {
  font-size: 0.85rem; font-weight: 800;
  color: #515F37;
}

.rank-cta {
  font-size: 0.75rem; font-weight: 600;
  color: #9ca3af;
  transition: color 0.15s;
}
.rank-card:hover .rank-cta { color: #515F37; }

/* ── PAGINATION ── */
.pagination {
  display: flex; align-items: center; justify-content: center;
  gap: 1rem; margin-top: 3rem; flex-wrap: wrap;
}

.page-btn {
  padding: 0.5rem 1.25rem;
  border: 1.5px solid #d6cda4; border-radius: 10px;
  background: #fff; color: #515F37;
  font-weight: 600; font-size: 0.875rem;
  cursor: pointer; transition: all 0.15s;
}
.page-btn:hover:not(:disabled) { background: #d6cda4; }
.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.page-nums { display: flex; gap: 0.35rem; }
.page-num {
  width: 36px; height: 36px;
  border: 1.5px solid #e5e2d3; border-radius: 8px;
  background: #fff; color: #374151;
  font-weight: 500; font-size: 0.875rem;
  cursor: pointer; transition: all 0.15s;
}
.page-num:hover { border-color: #515F37; color: #515F37; }
.page-num.active { background: #515F37; border-color: #515F37; color: #fff; }

/* ── SKELETON ── */
.skeleton-card {
  background: #fff;
  border: 1px solid #e5e2d3;
  border-radius: 16px;
  overflow: hidden;
}
.skeleton {
  background: linear-gradient(90deg, #f3f0e8 25%, #ebe8de 50%, #f3f0e8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── RESPONSIVE ── */
@media (max-width: 768px) {
  .container { padding: 0 1rem; }
  .filter-row { flex-direction: column; gap: 1rem; }
  .search-row { flex-direction: column; }
  .input-wrap { max-width: 100%; }
  .map-btn { display: none; }
}

@media (max-width: 600px) {
  .podium-grid { grid-template-columns: 1fr; align-items: unset; }
  .podium-card.podium-first { order: -1; }
}
</style>
