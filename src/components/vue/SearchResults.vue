<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { searchPrestataires } from '../../services/users';
import { useCategoriesStore } from '../../stores/categories';
import { trackSearch, trackViewProfile } from '../../services/analytics';
import type { User } from '../../types';
import PrestataireCard from './PrestataireCard.vue';
import SearchFilters from './SearchFilters.vue';
import SearchAutocomplete from './SearchAutocomplete.vue';

const categoriesStore = useCategoriesStore();
const props = defineProps<{ initialQuery?: string }>();

const results = ref<User[]>([]);
const total = ref(0);
const page = ref(1);
const query = ref(props.initialQuery ?? '');
const loading = ref(false);
const PAGE_SIZE = 12;

type SortKey = 'rating' | 'price_asc' | 'distance';
const sortBy = ref<SortKey>('rating');
const userCoords = ref<{ lat: number; lng: number } | null>(null);
const geoLoading = ref(false);
const geoError = ref('');

interface Filters {
  categories: string[];
  minRating: number;
  maxPrice: number;
}
const filters = ref<Filters>({ categories: [], minRating: 0, maxPrice: 200 });

const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE));

const SORTS: { key: SortKey; label: string; icon: string }[] = [
  { key: 'rating',    label: 'Mieux notés',   icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>` },
  { key: 'price_asc', label: 'Prix croissant', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>` },
  { key: 'distance',  label: 'Distance',       icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>` },
];

async function load() {
  loading.value = true;
  if (page.value === 1) {
    trackSearch(query.value);
  }
  try {
    const params: Parameters<typeof searchPrestataires>[0] = {
      q: query.value || undefined,
      page: page.value,
      pageSize: PAGE_SIZE,
      sort: sortBy.value,
    };
    if (sortBy.value === 'distance' && userCoords.value) {
      params.lat = userCoords.value.lat;
      params.lng = userCoords.value.lng;
    }
    let data = await searchPrestataires(params);

    // Apply filters client-side
    if (filters.value.categories.length > 0 || filters.value.minRating > 0 || filters.value.maxPrice < 200) {
      data.items = data.items.filter(prest => {
        // Category filter
        if (filters.value.categories.length > 0) {
          const prestCats = (prest.prestataire?.prestations ?? []) as string[];
          const hasMatch = filters.value.categories.some(cat =>
            prestCats.some(pc => pc.toLowerCase().includes(cat.toLowerCase()))
          );
          if (!hasMatch) return false;
        }
        // Rating filter
        if (filters.value.minRating > 0) {
          const rating = (prest.prestataire?.averageRating ?? 0) as number;
          if (rating < filters.value.minRating) return false;
        }
        // Price filter
        if (filters.value.maxPrice < 200) {
          const price = (prest.prestataire?.tarifHoraire ?? 200) as number;
          if (price > filters.value.maxPrice) return false;
        }
        return true;
      });
      data.total = data.items.length;
    }

    results.value = data.items;
    total.value = data.total;
    updateUrlParams();
  } finally {
    loading.value = false;
  }
}

function updateUrlParams() {
  const params = new URLSearchParams();
  if (query.value) params.set('q', query.value);
  if (filters.value.categories.length > 0) params.set('categories', filters.value.categories.join(','));
  if (filters.value.minRating > 0) params.set('minRating', filters.value.minRating.toString());
  if (filters.value.maxPrice < 200) params.set('maxPrice', filters.value.maxPrice.toString());
  window.history.replaceState({}, '', `?${params.toString()}`);
}

function loadFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  query.value = params.get('q') ?? '';
  const categories = params.get('categories')?.split(',') ?? [];
  const minRating = parseInt(params.get('minRating') ?? '0');
  const maxPrice = parseInt(params.get('maxPrice') ?? '200');
  filters.value = { categories, minRating, maxPrice };
}

function search() {
  const params = new URLSearchParams();
  if (query.value) params.set('prestation', query.value);
  window.location.href = `/carte${params.size ? '?' + params.toString() : ''}`;
}

function handleAutocompleteSelect(suggestion: any) {
  // If it's a service, update filter and reload
  if (suggestion.type === 'service') {
    filters.value.categories = [suggestion.value];
  }
  // If it's a city, search by city name
  if (suggestion.type === 'city') {
    query.value = suggestion.value;
  }
  page.value = 1;
  load();
}

function selectService(name: string) {
  window.location.href = `/carte?prestation=${encodeURIComponent(name)}`;
}

function goPage(p: number) {
  page.value = p;
  load();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selectSort(key: SortKey) {
  if (key === 'distance') { requestGeo(); return; }
  sortBy.value = key;
  page.value = 1;
  load();
}

function requestGeo() {
  if (!navigator.geolocation) {
    geoError.value = 'Géolocalisation non supportée par ce navigateur.';
    return;
  }
  if (userCoords.value) {
    sortBy.value = 'distance'; page.value = 1; load(); return;
  }
  geoLoading.value = true;
  geoError.value = '';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userCoords.value = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      geoLoading.value = false; sortBy.value = 'distance'; page.value = 1; load();
    },
    () => {
      geoLoading.value = false;
      geoError.value = 'Localisation refusée. Activez la géolocalisation dans votre navigateur.';
    },
    { timeout: 8000 },
  );
}

function distanceKm(user: User): number | null {
  if (!userCoords.value || !user.location?.coordinates) return null;
  const [lng, lat] = user.location.coordinates;
  const R = 6371;
  const dLat = (lat - userCoords.value.lat) * Math.PI / 180;
  const dLng = (lng - userCoords.value.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(userCoords.value.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(user: User): string | null {
  const d = distanceKm(user);
  if (d === null) return null;
  return d < 1 ? `< 1 km` : `${Math.round(d)} km`;
}

onMounted(() => {
  if (!props.initialQuery) {
    loadFiltersFromUrl();
  }
  categoriesStore.load();
  load();
});

// Watch filters and reload
const watchFilters = computed(() => JSON.stringify(filters.value));
watch(watchFilters, () => {
  page.value = 1;
  load();
});
</script>

<template>
  <div class="search-page">

    <!-- ══ HERO ═══════════════════════════════════════════════════ -->
    <section class="search-hero">
      <div class="hero-deco" aria-hidden="true">
        <svg class="leaf leaf-a" viewBox="0 0 220 300" xmlns="http://www.w3.org/2000/svg">
          <path d="M110,8 C175,8 212,65 212,150 C212,235 175,292 110,292 C45,292 8,235 8,150 C8,65 45,8 110,8Z" fill="rgba(168,196,122,0.07)"/>
        </svg>
        <svg class="leaf leaf-b" viewBox="0 0 180 260" xmlns="http://www.w3.org/2000/svg">
          <path d="M90,6 C148,6 174,58 174,130 C174,202 148,254 90,254 C32,254 6,202 6,130 C6,58 32,6 90,6Z" fill="rgba(255,255,255,0.04)"/>
        </svg>
        <svg class="leaf leaf-c" viewBox="0 0 260 340" xmlns="http://www.w3.org/2000/svg">
          <path d="M130,10 C205,10 250,75 250,170 C250,265 205,330 130,330 C55,330 10,265 10,170 C10,75 55,10 130,10Z" fill="rgba(255,255,255,0.025)"/>
        </svg>
        <div class="deco-ring deco-ring-a"></div>
        <div class="deco-ring deco-ring-b"></div>
      </div>

      <div class="hero-inner">
        <p class="hero-eyebrow">Annuaire des jardiniers</p>
        <h1 class="hero-title">
          Trouvez votre<br>
          <span class="hero-accent">jardinier idéal</span>
        </h1>
        <p class="hero-sub">
          <template v-if="loading">Recherche en cours…</template>
          <template v-else>
            <strong>{{ total }}</strong> professionnel{{ total !== 1 ? 's' : '' }} vérifié{{ total !== 1 ? 's' : '' }} partout en France
          </template>
        </p>

        <form class="search-bar" @submit.prevent="search">
          <svg class="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <div class="search-input-wrapper">
            <SearchAutocomplete
              :modelValue="query"
              @update:modelValue="query = $event"
              @select="handleAutocompleteSelect"
            />
          </div>
          <button type="submit">Rechercher</button>
        </form>

        <div class="chip-scroll">
          <div class="chip-track">
            <button
              v-for="cat in categoriesStore.categories"
              :key="cat._id"
              :class="['chip', { 'chip--on': query === cat.name }]"
              type="button"
              @click="selectService(cat.name)"
            >{{ cat.name }}</button>
          </div>
          <div class="chip-fade"></div>
        </div>
      </div>
    </section>

    <!-- ══ FILTER BAR ════════════════════════════════════════════ -->
    <div class="filter-bar">
      <div class="filter-bar-inner">
        <div class="sort-group">
          <span class="sort-label">Trier :</span>
          <div class="sort-pills">
            <button
              v-for="s in SORTS"
              :key="s.key"
              :class="['pill', { 'pill--on': sortBy === s.key, 'pill--spin': s.key === 'distance' && geoLoading }]"
              type="button"
              @click="selectSort(s.key)"
              :disabled="s.key === 'distance' && geoLoading"
            >
              <span v-html="s.icon"></span>
              <span v-if="s.key === 'distance' && geoLoading">Localisation…</span>
              <span v-else>{{ s.label }}</span>
            </button>
          </div>
        </div>

        <div class="filter-end">
          <span v-if="query && !loading" class="active-filter">
            {{ query }}
            <button class="filter-clear" @click="query = ''; search()" aria-label="Effacer">×</button>
          </span>
          <a href="/carte" class="map-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
              <line x1="9" y1="3" x2="9" y2="18"/>
              <line x1="15" y1="6" x2="15" y2="21"/>
            </svg>
            Carte
          </a>
        </div>
      </div>

      <div v-if="geoError" class="geo-error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ geoError }}
      </div>
    </div>

    <!-- ══ RESULTS ════════════════════════════════════════════════ -->
    <div class="results-section">
      <div class="results-inner">
        <!-- Filters Sidebar (desktop) -->
        <aside class="filters-sidebar">
          <SearchFilters v-model="filters" :maxPriceLimit="200" />
        </aside>

        <!-- Skeleton -->
        <template v-if="loading">
          <div class="results-grid">
            <div v-for="i in 9" :key="i" class="skel-card">
              <div class="skel skel-photo"></div>
              <div class="skel-body">
                <div class="skel skel-ln skel-ln--lg"></div>
                <div class="skel skel-ln skel-ln--sm"></div>
                <div class="skel skel-ln skel-ln--md"></div>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <!-- Meta -->
          <p class="meta-count" v-if="results.length">
            <strong>{{ total }}</strong> résultat{{ total !== 1 ? 's' : '' }}
            <span class="meta-sort" v-if="sortBy === 'distance' && userCoords">· triés par distance</span>
            <span class="meta-sort" v-else-if="sortBy === 'rating'">· triés par note</span>
            <span class="meta-sort" v-else-if="sortBy === 'price_asc'">· triés par prix</span>
          </p>

          <!-- Empty -->
          <div v-if="!results.length" class="empty-state">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <h3>Aucun jardinier trouvé</h3>
            <p v-if="query">Aucun résultat pour « <strong>{{ query }}</strong> ».<br>Essayez un autre terme.</p>
            <p v-else>Il n'y a pas encore de jardiniers dans cette zone.</p>
            <button class="btn-reset" @click="query = ''; search()">Voir tous les jardiniers</button>
          </div>

          <!-- Grid -->
          <div v-else class="results-grid">
            <div v-for="user in results" :key="user._id" class="card-wrap">
              <PrestataireCard :user="user" />
              <span v-if="sortBy === 'distance' && formatDist(user)" class="dist-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {{ formatDist(user) }}
              </span>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="pagination">
            <button class="pag-btn" :disabled="page === 1" @click="goPage(page - 1)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
              Précédent
            </button>
            <div class="pag-nums">
              <button
                v-for="p in totalPages" :key="p"
                :class="['pag-num', { 'pag-num--on': p === page }]"
                @click="goPage(p)"
              >{{ p }}</button>
            </div>
            <button class="pag-btn" :disabled="page === totalPages" @click="goPage(page + 1)">
              Suivant
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </template>

      </div>
    </div>

  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.search-page { background: #f2efe6; min-height: 100vh; }

/* ══ HERO ═══════════════════════════════════════════════════════ */
.search-hero {
  position: relative;
  background: linear-gradient(155deg, #141f0b 0%, #253515 55%, #3a5020 100%);
  padding: 2.5rem 0 2rem;
  overflow: hidden;
}

@media (max-width: 768px) {
  .search-hero {
    padding: 3rem 0 2.5rem;
  }
}

.hero-deco { position: absolute; inset: 0; pointer-events: none; }
.leaf { position: absolute; }
.leaf-a { width: 280px; height: 380px; right: -60px; top: -80px; }
.leaf-b { width: 200px; height: 290px; right: 180px; bottom: -100px; }
.leaf-c { width: 320px; height: 420px; left: -120px; top: 50%; transform: translateY(-50%); }
.deco-ring {
  position: absolute; border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.055);
}
.deco-ring-a { width: 520px; height: 520px; top: -220px; right: -80px; }
.deco-ring-b { width: 320px; height: 320px; bottom: -160px; left: -60px; }

.hero-inner {
  position: relative; z-index: 1;
  max-width: 740px; margin: 0 auto; padding: 0 2rem;
  display: flex; flex-direction: column; gap: 1.5rem;
}

.hero-eyebrow {
  font-size: 0.68rem; font-weight: 700; letter-spacing: 0.18em;
  text-transform: uppercase; color: rgba(214,205,164,0.72); margin: 0;
}

.hero-title {
  font-size: clamp(2rem, 5vw, 3.2rem); font-weight: 900;
  color: #fff; margin: 0; line-height: 1.07; letter-spacing: -0.04em;
}
.hero-accent { color: #a8c47a; font-style: italic; }

.hero-sub { font-size: 0.95rem; color: rgba(255,255,255,0.5); margin: 0; }
.hero-sub strong { color: #d6cda4; font-weight: 700; }

/* Search bar */
.search-bar {
  display: flex; align-items: center;
  background: #FCFAF5; border-radius: 18px; overflow: visible;
  box-shadow: 0 14px 44px rgba(0,0,0,0.3);
  transition: box-shadow 0.2s;
  position: relative;
}
.search-bar:focus-within {
  box-shadow: 0 14px 44px rgba(0,0,0,0.32), 0 0 0 3px rgba(168,196,122,0.45);
}
.sb-icon { width: 18px; height: 18px; color: #9ca3af; flex-shrink: 0; margin-left: 1.25rem; }

.search-input-wrapper {
  flex: 1;
  position: relative;
}

.search-bar input {
  flex: 1; padding: 1.1rem 0.875rem; border: none; outline: none;
  font-size: 1rem; color: #1a1a0e; background: transparent; font-family: inherit;
}
.search-bar input::placeholder { color: #b5ae94; }
.search-bar input::-webkit-search-cancel-button { display: none; }
.search-bar button {
  padding: 1.1rem 2rem; background: #3a5020; color: #fff;
  border: none; cursor: pointer; font-weight: 700; font-size: 0.9rem;
  white-space: nowrap; flex-shrink: 0; transition: background 0.15s; font-family: inherit;
}
.search-bar button:hover { background: #2a3c16; }

/* Chips */
.chip-scroll { position: relative; }
.chip-fade {
  position: absolute; right: 0; top: 0; bottom: 0; width: 50px;
  background: linear-gradient(to right, transparent, rgba(20,31,11,0.88));
  pointer-events: none;
}
.chip-track {
  display: flex; gap: 0.5rem; overflow-x: auto; scrollbar-width: none;
  padding-bottom: 3px; -webkit-overflow-scrolling: touch;
}
.chip-track::-webkit-scrollbar { display: none; }
.chip {
  padding: 0.42rem 1.05rem;
  border: 1.5px solid rgba(255,255,255,0.16); border-radius: 999px;
  background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.75);
  font-size: 0.82rem; font-weight: 500; cursor: pointer; white-space: nowrap; flex-shrink: 0;
  transition: all 0.15s; font-family: inherit;
}
.chip:hover { border-color: #a8c47a; color: #a8c47a; }
.chip--on { background: #a8c47a; border-color: #a8c47a; color: #1a1a0e; font-weight: 700; }

/* ══ FILTER BAR ══════════════════════════════════════════════════ */
.filter-bar {
  position: sticky; top: 60px; z-index: 10;
  background: rgba(255,255,255,0.97);
  border-bottom: 1px solid #e9e5d6;
  box-shadow: 0 2px 14px rgba(0,0,0,0.07);
  backdrop-filter: blur(10px);
}
.filter-bar-inner {
  max-width: 1100px; margin: 0 auto; padding: 0.75rem 2rem;
  display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
}

.sort-group { display: flex; align-items: center; gap: 0.75rem; }
.sort-label { font-size: 0.75rem; font-weight: 600; color: #aaa49a; white-space: nowrap; }
.sort-pills { display: flex; gap: 0.35rem; }
.pill {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.44rem 1rem;
  border: 1.5px solid #e5e2d3; border-radius: 999px;
  background: #FCFAF5; color: #6b6347;
  font-size: 0.8rem; font-weight: 500; cursor: pointer;
  transition: all 0.15s; white-space: nowrap; font-family: inherit;
}
.pill:hover:not(:disabled) { border-color: #515F37; color: #515F37; background: #f5f2ea; }
.pill--on { background: #3a5020; border-color: #3a5020; color: #fff; font-weight: 700; }
.pill:disabled { opacity: 0.6; cursor: wait; }
.pill--spin { border-color: #515F37; color: #515F37; }

.filter-end { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }

.active-filter {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.28rem 0.5rem 0.28rem 0.8rem;
  background: #3a5020; color: #fff;
  border-radius: 999px; font-size: 0.78rem; font-weight: 600;
}
.filter-clear {
  display: flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; line-height: 1;
  background: rgba(255,255,255,0.25); border: none; border-radius: 50%;
  cursor: pointer; color: #fff; font-size: 1rem; transition: background 0.15s;
}
.filter-clear:hover { background: rgba(255,255,255,0.4); }

.map-link {
  display: inline-flex; align-items: center; gap: 0.35rem;
  font-size: 0.82rem; font-weight: 600; color: #515F37;
  text-decoration: none; padding: 0.4rem 0.9rem;
  border: 1.5px solid #d6cda4; border-radius: 999px; transition: all 0.15s;
}
.map-link:hover { background: #d6cda4; }

.geo-error {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 2rem; font-size: 0.8rem; color: #dc2626;
  background: #fef2f2; border-top: 1px solid #fecaca;
}

/* ══ RESULTS ══════════════════════════════════════════════════════ */
.results-section { padding: 2rem 0 6rem; }
.results-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2rem;
}

.filters-sidebar {
  display: none;
}

@media (min-width: 1024px) {
  .filters-sidebar {
    display: block;
    position: sticky;
    top: 180px;
    height: fit-content;
  }
}

.meta-count { font-size: 0.82rem; color: #9ca3af; margin: 0 0 1.25rem; }
.meta-count strong { color: #1a1a0e; font-weight: 700; }
.meta-sort { color: #b5ae94; }

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(295px, 1fr));
  gap: 1.5rem;
}

.card-wrap { position: relative; }
.dist-badge {
  position: absolute; top: 12px; left: 12px; z-index: 2;
  display: inline-flex; align-items: center; gap: 0.3rem;
  padding: 0.28rem 0.65rem;
  background: rgba(20,35,26,0.84); color: #d6cda4;
  border-radius: 999px; font-size: 0.7rem; font-weight: 700;
  backdrop-filter: blur(4px); pointer-events: none;
}

/* Empty state */
.empty-state {
  text-align: center; padding: 5rem 2rem; max-width: 440px; margin: 0 auto;
}
.empty-icon {
  width: 80px; height: 80px; background: rgba(81,95,55,0.08); border-radius: 24px;
  display: flex; align-items: center; justify-content: center; color: #515F37;
  margin: 0 auto 1.5rem;
}
.empty-state h3 { font-size: 1.2rem; font-weight: 800; color: #1a1a0e; margin-bottom: 0.75rem; }
.empty-state p { font-size: 0.9rem; color: #6b6347; line-height: 1.65; margin-bottom: 1.75rem; }
.empty-state strong { color: #1a1a0e; }
.btn-reset {
  padding: 0.75rem 1.75rem; background: #3a5020; color: #fff;
  border: none; border-radius: 12px; font-size: 0.9rem; font-weight: 700;
  cursor: pointer; transition: background 0.15s; font-family: inherit;
}
.btn-reset:hover { background: #2a3c16; }

/* Skeleton */
.skel-card { background: #FCFAF5; border: 1.5px solid #e9e5d6; border-radius: 20px; overflow: hidden; }
.skel {
  background: linear-gradient(90deg, #f3f0e8 25%, #ebe7dc 50%, #f3f0e8 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.skel-photo { height: 210px; }
.skel-body { padding: 1rem; display: flex; flex-direction: column; gap: 0.55rem; }
.skel-ln { border-radius: 6px; }
.skel-ln--lg { height: 14px; width: 60%; }
.skel-ln--sm { height: 11px; width: 38%; }
.skel-ln--md { height: 11px; width: 75%; margin-top: 0.25rem; }

/* Pagination */
.pagination {
  display: flex; align-items: center; justify-content: center;
  gap: 0.75rem; margin-top: 3.5rem; flex-wrap: wrap;
}
.pag-btn {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.6rem 1.35rem; border: 1.5px solid #d6cda4; border-radius: 12px;
  background: #FCFAF5; color: #515F37; font-weight: 600; font-size: 0.875rem;
  cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.pag-btn:hover:not(:disabled) { background: #d6cda4; }
.pag-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.pag-nums { display: flex; gap: 0.35rem; }
.pag-num {
  width: 40px; height: 40px; border: 1.5px solid #e5e2d3; border-radius: 10px;
  background: #FCFAF5; color: #374151; font-weight: 500; font-size: 0.875rem;
  cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.pag-num:hover { border-color: #515F37; color: #515F37; }
.pag-num--on { background: #3a5020; border-color: #3a5020; color: #fff; font-weight: 700; }

/* Responsive */
@media (max-width: 1023px) {
  .results-inner {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .hero-inner { gap: 1.25rem; }
  .filter-bar-inner { padding: 0.625rem 1rem; }
  .results-inner { padding: 0 1rem; }
  .results-section { padding: 1.5rem 0 4rem; }
  .sort-label { display: none; }
}
@media (max-width: 600px) {
  .results-grid { grid-template-columns: 1fr 1fr; gap: 0.875rem; }
  .pag-nums { display: none; }
}
@media (max-width: 440px) {
  .results-grid { grid-template-columns: 1fr; }
}
</style>
