<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getRanking } from '../../services/users';
import type { User } from '../../types';

const users = ref<User[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 12;
const prestation = ref('');
const ville = ref('');
const minRating = ref(0);
const loading = ref(false);

const totalPages = computed(() => Math.ceil(total.value / pageSize));

const SERVICES = ['Tonte', 'Taille de haies', 'Élagage', 'Débroussaillage', 'Plantation', 'Arrosage', 'Potager', 'Paysagisme'];
const RATINGS = [
  { label: 'Toutes', val: 0 },
  { label: '3+', val: 3 },
  { label: '4+', val: 4 },
  { label: '4.5+', val: 4.5 },
];

const filtered = computed(() =>
  users.value.filter(u => minRating.value === 0 || u.averageRating >= minRating.value)
);

const rankOffset = computed(() => (page.value - 1) * pageSize);

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

function goPage(p: number) {
  page.value = p;
  load();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

onMounted(load);

const MEDALS = ['🥇', '🥈', '🥉'];

function stars(n: number) {
  return { full: Math.round(n), empty: 5 - Math.round(n) };
}

function medalClass(rank: number) {
  if (rank === 1) return 'medal-gold';
  if (rank === 2) return 'medal-silver';
  if (rank === 3) return 'medal-bronze';
  return '';
}
</script>

<template>
  <div class="classement-page">

    <!-- Hero -->
    <div class="page-hero">
      <div class="container">
        <div class="hero-content">
          <span class="eyebrow">Classement 2025</span>
          <h1>Top Jardiniers</h1>
          <p>Les prestataires les mieux notés par les clients Gardee</p>
        </div>

        <!-- Filters -->
        <div class="filters">
          <div class="search-row">
            <input
              v-model="ville"
              type="text"
              placeholder="Ville ou code postal..."
              class="text-input"
              @keyup.enter="search"
            />
            <button class="search-btn" @click="search">Rechercher</button>
          </div>

          <div class="chip-group">
            <button
              v-for="s in SERVICES" :key="s"
              :class="['chip', { active: prestation === s }]"
              @click="toggleService(s)"
              type="button"
            >{{ s }}</button>
          </div>

          <div class="rating-row">
            <span class="rating-label">Note :</span>
            <div class="rating-group">
              <button
                v-for="r in RATINGS" :key="r.val"
                :class="['rating-btn', { active: minRating === r.val }]"
                @click="minRating = r.val"
              >{{ r.label }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="container main-content">

      <!-- Results meta -->
      <div class="results-meta">
        <span v-if="loading" class="meta-loading">
          <span class="spinner"></span> Chargement...
        </span>
        <template v-else>
          <span class="meta-count">
            <strong>{{ total }}</strong> prestataire{{ total > 1 ? 's' : '' }}
            <template v-if="prestation"> · {{ prestation }}</template>
            <template v-if="ville"> · {{ ville }}</template>
          </span>
          <button
            v-if="prestation || ville || minRating > 0"
            class="reset-btn"
            @click="prestation = ''; ville = ''; minRating = 0; search()"
          >Réinitialiser les filtres</button>
        </template>
      </div>

      <!-- Skeleton -->
      <template v-if="loading">
        <div class="top3-grid">
          <div v-for="i in 3" :key="i" class="top-card skeleton-card">
            <div class="skeleton" style="height:220px;border-radius:12px 12px 0 0"></div>
            <div style="padding:1rem;display:flex;flex-direction:column;gap:0.5rem">
              <div class="skeleton" style="height:14px;width:60%;border-radius:4px"></div>
              <div class="skeleton" style="height:12px;width:40%;border-radius:4px"></div>
            </div>
          </div>
        </div>
        <div class="grid">
          <div v-for="i in 6" :key="i" class="skeleton-card">
            <div class="skeleton" style="height:180px;border-radius:12px 12px 0 0"></div>
            <div style="padding:1rem;display:flex;flex-direction:column;gap:0.5rem">
              <div class="skeleton" style="height:13px;width:60%;border-radius:4px"></div>
              <div class="skeleton" style="height:11px;width:40%;border-radius:4px"></div>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <!-- Empty -->
        <div v-if="!filtered.length" class="empty">
          <span>🌿</span>
          <h3>Aucun jardinier trouvé</h3>
          <p>Essayez d'autres filtres ou une autre ville</p>
          <button class="btn-primary" @click="prestation = ''; ville = ''; minRating = 0; search()">
            Voir tous les jardiniers
          </button>
        </div>

        <template v-else>
          <!-- Top 3 podium -->
          <div v-if="page === 1 && filtered.length >= 3" class="top3-grid">
            <a
              v-for="(user, i) in filtered.slice(0, 3)"
              :key="user._id"
              :href="`/prestataires/${user._id}`"
              :class="['top-card', medalClass(i + 1)]"
            >
              <div class="top-card-photo">
                <img v-if="user.profil_image?.secure_url" :src="user.profil_image.secure_url" :alt="`${user.prenom} ${user.nom}`" loading="lazy" />
                <div v-else class="top-card-initials">{{ user.prenom[0] }}{{ user.nom[0] }}</div>
                <span class="medal-badge">{{ MEDALS[i] }}</span>
                <span v-if="user.tarifHoraire" class="price-badge">{{ user.tarifHoraire }} €/h</span>
              </div>
              <div class="top-card-body">
                <h3>{{ user.prenom }} {{ user.nom }}</h3>
                <p class="top-card-ville">{{ user.ville }}</p>
                <div v-if="user.numberOfReviews > 0" class="top-card-rating">
                  <span class="stars-full">
                    <span v-for="j in stars(user.averageRating).full" :key="`f${j}`">★</span>
                  </span>
                  <span class="stars-empty">
                    <span v-for="j in stars(user.averageRating).empty" :key="`e${j}`">★</span>
                  </span>
                  <span class="rating-val">{{ user.averageRating.toFixed(1) }}</span>
                  <span class="rating-count">({{ user.numberOfReviews }})</span>
                </div>
                <div class="top-card-tags">
                  <span v-for="p in user.prestations.slice(0, 2)" :key="p" class="tag">{{ p }}</span>
                </div>
              </div>
            </a>
          </div>

          <!-- Rest of the ranking -->
          <div class="grid">
            <a
              v-for="(user, i) in (page === 1 ? filtered.slice(3) : filtered)"
              :key="user._id"
              :href="`/prestataires/${user._id}`"
              class="rank-card"
            >
              <span class="rank-num">{{ rankOffset + (page === 1 ? i + 4 : i + 1) }}</span>
              <div class="rank-photo">
                <img v-if="user.profil_image?.secure_url" :src="user.profil_image.secure_url" :alt="`${user.prenom} ${user.nom}`" loading="lazy" />
                <div v-else class="rank-initials">{{ user.prenom[0] }}{{ user.nom[0] }}</div>
              </div>
              <div class="rank-body">
                <div class="rank-name">{{ user.prenom }} {{ user.nom }}</div>
                <div class="rank-ville">{{ user.ville }}</div>
                <div v-if="user.numberOfReviews > 0" class="rank-rating">
                  <span class="stars-full"><span v-for="j in stars(user.averageRating).full" :key="`f${j}`">★</span></span>
                  <span class="stars-empty"><span v-for="j in stars(user.averageRating).empty" :key="`e${j}`">★</span></span>
                  <span class="rating-val-sm">{{ user.averageRating.toFixed(1) }}</span>
                </div>
                <div class="rank-tags">
                  <span v-for="p in user.prestations.slice(0, 2)" :key="p" class="tag-sm">{{ p }}</span>
                </div>
              </div>
              <div class="rank-right">
                <span v-if="user.tarifHoraire" class="rank-price">{{ user.tarifHoraire }} €/h</span>
                <span class="rank-cta">Voir →</span>
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

.classement-page { background: #fafaf8; min-height: 100vh; }
.container { max-width: 1100px; margin: 0 auto; padding: 0 2rem; }

/* ── HERO ── */
.page-hero {
  background: linear-gradient(160deg, #f5f2ea 0%, #fafaf9 100%);
  border-bottom: 1px solid #e5e7eb;
  padding: 2.5rem 0 2rem;
}

.hero-content { margin-bottom: 1.5rem; }

.eyebrow {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #16a34a;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  margin-bottom: 0.75rem;
}

h1 { font-size: 2rem; font-weight: 900; color: #111827; margin: 0 0 0.35rem; letter-spacing: -0.02em; }
.hero-content p { color: #6b7280; font-size: 0.95rem; }

/* Filters */
.filters { display: flex; flex-direction: column; gap: 0.75rem; }

.search-row { display: flex; gap: 0.5rem; }

.text-input {
  flex: 1;
  max-width: 340px;
  padding: 0.55rem 0.875rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  font-size: 0.9rem;
  outline: none;
  background: #fff;
  transition: border-color 0.15s;
}
.text-input:focus { border-color: #16a34a; }

.search-btn {
  padding: 0.55rem 1.25rem;
  background: #16a34a;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.search-btn:hover { background: #15803d; }

.chip-group { display: flex; flex-wrap: wrap; gap: 0.35rem; }

.chip {
  padding: 0.3rem 0.8rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 999px;
  background: #fff;
  color: #374151;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.chip:hover { border-color: #16a34a; color: #16a34a; }
.chip.active { background: #16a34a; border-color: #16a34a; color: #fff; }

.rating-row { display: flex; align-items: center; gap: 0.75rem; }
.rating-label { font-size: 0.8rem; font-weight: 600; color: #6b7280; white-space: nowrap; }
.rating-group { display: flex; gap: 0.35rem; }

.rating-btn {
  padding: 0.3rem 0.75rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.rating-btn:hover { border-color: #16a34a; color: #16a34a; }
.rating-btn.active { background: #16a34a; border-color: #16a34a; color: #fff; }

/* ── MAIN ── */
.main-content { padding-top: 1.5rem; padding-bottom: 3rem; }

.results-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  min-height: 28px;
}

.meta-count { font-size: 0.875rem; color: #374151; }
.meta-count strong { font-weight: 700; }

.meta-loading { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #6b7280; }

.spinner {
  width: 14px; height: 14px;
  border: 2px solid #e5e7eb;
  border-top-color: #16a34a;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

.reset-btn {
  font-size: 0.78rem; color: #6b7280;
  background: none; border: 1px solid #e5e7eb;
  border-radius: 6px; padding: 0.3rem 0.75rem;
  cursor: pointer; transition: all 0.15s;
}
.reset-btn:hover { border-color: #16a34a; color: #16a34a; }

/* ── EMPTY ── */
.empty { text-align: center; padding: 5rem 2rem; }
.empty span { font-size: 3rem; display: block; margin-bottom: 1rem; }
.empty h3 { font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem; }
.empty p { color: #6b7280; margin-bottom: 1.5rem; }
.btn-primary {
  padding: 0.65rem 1.5rem; background: #16a34a; color: #fff;
  border: none; border-radius: 8px; font-weight: 600; cursor: pointer;
}

/* ── TOP 3 ── */
.top3-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.top-card {
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  border: 2px solid #e5e7eb;
  background: #fff;
  transition: transform 0.2s, box-shadow 0.2s;
}

.top-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 40px rgba(0,0,0,0.1);
}

.top-card.medal-gold  { border-color: #fbbf24; }
.top-card.medal-silver { border-color: #d1d5db; }
.top-card.medal-bronze { border-color: #d97706; }

.top-card-photo {
  position: relative;
  height: 220px;
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  overflow: hidden;
  flex-shrink: 0;
}

.top-card-photo img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.top-card:hover .top-card-photo img { transform: scale(1.04); }

.top-card-initials {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  font-weight: 900;
  color: #065f46;
}

.medal-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  font-size: 1.75rem;
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.price-badge {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: #111827;
  color: #fff;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.top-card-body { padding: 1.125rem; flex: 1; }
.top-card-body h3 { font-size: 1.05rem; font-weight: 700; margin: 0 0 0.2rem; color: #111827; }
.top-card-ville { font-size: 0.8rem; color: #9ca3af; margin: 0 0 0.5rem; }

.top-card-rating {
  display: flex; align-items: center; gap: 0.2rem;
  font-size: 0.875rem; margin-bottom: 0.6rem;
}

.stars-full { color: #f59e0b; }
.stars-empty { color: #e5e7eb; }
.rating-val { font-weight: 700; font-size: 0.875rem; color: #111827; margin-left: 0.25rem; }
.rating-count { font-size: 0.78rem; color: #9ca3af; }

.top-card-tags { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.tag {
  background: #f0fdf4; color: #15803d;
  border: 1px solid #d1fae5;
  padding: 0.18rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem; font-weight: 500;
}

/* ── RANK GRID ── */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 0.75rem;
}

.rank-card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  background: #fff;
  border: 1.5px solid #e5e7eb;
  border-radius: 14px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.rank-card:hover {
  border-color: #d1fae5;
  box-shadow: 0 4px 16px rgba(0,0,0,0.07);
}

.rank-num {
  font-size: 0.85rem;
  font-weight: 800;
  color: #d1d5db;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.rank-photo {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
}
.rank-photo img { width: 100%; height: 100%; object-fit: cover; }

.rank-initials {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem; font-weight: 800; color: #065f46;
}

.rank-body { flex: 1; min-width: 0; }
.rank-name { font-size: 0.9rem; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rank-ville { font-size: 0.75rem; color: #9ca3af; margin-top: 0.1rem; }

.rank-rating { display: flex; align-items: center; gap: 1px; margin-top: 0.25rem; }
.rating-val-sm { font-size: 0.72rem; font-weight: 700; color: #374151; margin-left: 0.2rem; }

.rank-tags { display: flex; gap: 0.25rem; margin-top: 0.35rem; }
.tag-sm {
  background: #f0fdf4; color: #15803d;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  font-size: 0.68rem; font-weight: 500;
  border: 1px solid #d1fae5;
}

.rank-right {
  display: flex; flex-direction: column;
  align-items: flex-end; gap: 0.35rem;
  flex-shrink: 0;
}

.rank-price {
  font-size: 0.8rem; font-weight: 700;
  color: #111827; background: #f3f4f6;
  padding: 0.2rem 0.5rem; border-radius: 6px;
}

.rank-cta { font-size: 0.78rem; font-weight: 600; color: #16a34a; }
.rank-card:hover .rank-cta { text-decoration: underline; }

/* ── PAGINATION ── */
.pagination {
  display: flex; align-items: center; justify-content: center;
  gap: 1rem; margin-top: 2.5rem; flex-wrap: wrap;
}

.page-btn {
  padding: 0.5rem 1.1rem;
  border: 1.5px solid #e5e7eb; border-radius: 8px;
  background: #fff; color: #374151;
  font-weight: 500; font-size: 0.875rem;
  cursor: pointer; transition: all 0.15s;
}
.page-btn:hover:not(:disabled) { border-color: #16a34a; color: #16a34a; }
.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.page-nums { display: flex; gap: 0.35rem; }
.page-num {
  width: 36px; height: 36px;
  border: 1.5px solid #e5e7eb; border-radius: 8px;
  background: #fff; color: #374151;
  font-weight: 500; font-size: 0.875rem;
  cursor: pointer; transition: all 0.15s;
}
.page-num:hover { border-color: #16a34a; color: #16a34a; }
.page-num.active { background: #16a34a; border-color: #16a34a; color: #fff; }

/* ── SKELETON ── */
.skeleton-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  overflow: hidden;
}
.skeleton {
  background: linear-gradient(90deg, #f3f4f6 25%, #e9ebec 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── RESPONSIVE ── */
@media (max-width: 768px) {
  .top3-grid { grid-template-columns: 1fr; }
  .grid { grid-template-columns: 1fr; }
  .search-row { flex-direction: column; }
  .text-input { max-width: 100%; }
}
</style>
