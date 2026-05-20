<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { getRanking } from '../../services/users';
import { useCategoriesStore } from '../../stores/categories';
import { getAvatar } from '../../composables/useAvatar';
import type { User } from '../../types';

const service = ref('');
const ville = ref('');
const minRating = ref(0);
const maxTarif = ref(150);
const users = ref<User[]>([]);
const loading = ref(false);
const selectedId = ref<string | null>(null);
const mapEl = ref<HTMLDivElement>();

// Mobile state
const mobileView = ref<'carte' | 'liste'>('carte');
const showFilterDrawer = ref(false);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let map: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let L: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let clusterGroup: any = null;
const markerById = new Map<string, any>();

const categoriesStore = useCategoriesStore();
const RATINGS = [
  { label: 'Toutes', val: 0 },
  { label: '3+', val: 3 },
  { label: '4+', val: 4 },
  { label: '4.5+', val: 4.5 },
];

const filtered = computed(() =>
  users.value.filter(u => {
    if (minRating.value > 0 && u.averageRating < minRating.value) return false;
    if (maxTarif.value < 150 && u.tarifHoraire && u.tarifHoraire > maxTarif.value) return false;
    return true;
  })
);

const hasActiveFilters = computed(() =>
  !!(service.value || ville.value || minRating.value > 0 || maxTarif.value < 150)
);

async function load() {
  loading.value = true;
  try {
    const data = await getRanking({
      prestation: service.value || undefined,
      ville: ville.value || undefined,
      pageSize: 100,
    });
    users.value = data.items.filter(u => u.location);
  } finally {
    loading.value = false;
  }
}

function updateMarkers() {
  if (!map || !L) return;

  if (clusterGroup) map.removeLayer(clusterGroup);
  markerById.clear();

  clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 60,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    animate: true,
    iconCreateFunction: (cluster: any) => {
      const count = cluster.getChildCount();
      const size = count >= 10 ? 'lg' : count >= 5 ? 'md' : 'sm';
      return L.divIcon({
        html: `<div class="gd-cluster gd-cluster--${size}"><span>${count}</span></div>`,
        className: '',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
    },
  });

  for (const user of filtered.value) {
    if (!user.location) continue;
    const [lng, lat] = user.location.coordinates;
    const isSel = selectedId.value === user._id;

    const icon = L.divIcon({
      html: `<div class="gd-marker${isSel ? ' gd-marker--sel' : ''}">
        <img src="${getAvatar(user._id, user.profil_image?.secure_url)}" alt="" />
      </div>`,
      className: '',
      iconSize: [42, 42],
      iconAnchor: [21, 42],
      popupAnchor: [0, -44],
    });

    const marker = L.marker([lat, lng], { icon })
      .bindPopup(`
        <div class="gd-popup">
          <strong>${user.prenom} ${user.nom}</strong>
          <span>${user.ville}</span>
          ${user.tarifHoraire ? `<span class="gd-popup-tarif">${user.tarifHoraire} €/h</span>` : ''}
          <a href="/prestataires/?id=${user._id}">Voir le profil →</a>
        </div>
      `)
      .on('click', () => {
        selectedId.value = user._id;
        document.getElementById(`card-${user._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });

    clusterGroup.addLayer(marker);
    markerById.set(user._id, marker);
  }

  map.addLayer(clusterGroup);
}

function flyTo(user: User) {
  if (!map || !user.location) return;
  const [lng, lat] = user.location.coordinates;
  map.flyTo([lat, lng], 14, { duration: 0.8 });
  const marker = markerById.get(user._id);
  if (marker) {
    clusterGroup?.zoomToShowLayer(marker, () => marker.openPopup());
  }
}

watch(filtered, updateMarkers);
watch(selectedId, updateMarkers);

watch(mobileView, async (v) => {
  if (v === 'carte' && map) {
    await nextTick();
    map.invalidateSize();
  }
});

onMounted(async () => {
  categoriesStore.load();

  L = (await import('leaflet')).default;
  await import('leaflet/dist/leaflet.css');
  await import('leaflet.markercluster');
  await import('leaflet.markercluster/dist/MarkerCluster.css');
  await import('leaflet.markercluster/dist/MarkerCluster.Default.css');

  map = L.map(mapEl.value!).setView([46.8, 2.3], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 12, { duration: 1.2 });
        const youIcon = L.divIcon({
          html: '<div class="you-marker"></div>',
          className: '',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        L.marker([latitude, longitude], { icon: youIcon })
          .addTo(map)
          .bindPopup('<div class="gd-popup"><strong>Votre position</strong></div>');
      },
      () => {},
      { timeout: 6000, maximumAge: 300000 }
    );
  }

  await load();
  updateMarkers();
});

onUnmounted(() => { if (map) map.remove(); });

async function applyFilters() {
  await load();
  updateMarkers();
}

function toggleService(s: string) {
  service.value = service.value === s ? '' : s;
  applyFilters();
}

function selectCard(user: User) {
  selectedId.value = user._id;
  mobileView.value = 'carte';
  flyTo(user);
}

function resetFilters() {
  service.value = '';
  ville.value = '';
  minRating.value = 0;
  maxTarif.value = 150;
  applyFilters();
}

function stars(n: number) {
  return { full: Math.round(n), empty: 5 - Math.round(n) };
}
</script>

<template>
  <div class="carte-layout">

    <!-- ── MOBILE STICKY HEADER ── -->
    <div class="mobile-sticky">
      <!-- Search + Filtres button -->
      <div class="mobile-search-row">
        <div class="mobile-input-wrap">
          <svg class="mobile-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            v-model="ville"
            type="text"
            placeholder="Ville ou code postal..."
            class="mobile-text-input"
            @keyup.enter="applyFilters"
          />
        </div>
        <button class="mobile-search-btn" @click="applyFilters" aria-label="Chercher">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
        <button :class="['mobile-filter-btn', { 'has-filters': hasActiveFilters }]" @click="showFilterDrawer = true" type="button">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          Filtres
          <span v-if="hasActiveFilters" class="filter-dot"></span>
        </button>
      </div>

      <!-- Service chips (horizontal scroll) -->
      <div class="mobile-chips-scroll">
        <button
          v-for="cat in categoriesStore.categories"
          :key="cat._id"
          :class="['mobile-chip', { active: service === cat._id }]"
          @click="toggleService(cat._id)"
          type="button"
        >{{ cat.name }}</button>
      </div>

      <!-- Tabs Carte / Liste -->
      <div class="mobile-tabs">
        <button :class="['mobile-tab', { active: mobileView === 'carte' }]" @click="mobileView = 'carte'" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
          Carte
        </button>
        <button :class="['mobile-tab', { active: mobileView === 'liste' }]" @click="mobileView = 'liste'" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          Liste
          <span class="tab-count">{{ loading ? '…' : filtered.length }}</span>
        </button>
      </div>
    </div>

    <!-- ── DESKTOP SIDEBAR ── -->
    <aside class="sidebar">
      <div class="filters">
        <h2>Trouver un jardinier</h2>

        <div class="filter-group">
          <label class="filter-label">Ville ou code postal</label>
          <div class="search-row">
            <input v-model="ville" type="text" placeholder="Paris, Lyon, 75001..." class="text-input" @keyup.enter="applyFilters" />
            <button class="search-btn" @click="applyFilters" aria-label="Chercher">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </div>
        </div>

        <div class="filter-group">
          <label class="filter-label">Service</label>
          <div class="chip-group">
            <button v-for="cat in categoriesStore.categories" :key="cat._id" :class="['chip', { active: service === cat._id }]" @click="toggleService(cat._id)" type="button">{{ cat.name }}</button>
          </div>
        </div>

        <div class="filter-group">
          <label class="filter-label">Note minimum</label>
          <div class="rating-group">
            <button v-for="r in RATINGS" :key="r.val" :class="['rating-btn', { active: minRating === r.val }]" @click="minRating = r.val; updateMarkers()">{{ r.label }}</button>
          </div>
        </div>

        <div class="filter-group">
          <label class="filter-label">
            Tarif max
            <span class="filter-value">{{ maxTarif < 150 ? maxTarif + ' €/h' : 'Illimité' }}</span>
          </label>
          <input type="range" v-model.number="maxTarif" min="20" max="150" step="5" class="range-slider" @input="updateMarkers" />
          <div class="range-labels"><span>20 €</span><span>150 €+</span></div>
        </div>
      </div>

      <div class="results-header">
        <span v-if="loading" class="loading-text"><span class="spinner"></span> Chargement...</span>
        <span v-else><strong>{{ filtered.length }}</strong> jardinier{{ filtered.length > 1 ? 's' : '' }}</span>
        <button v-if="hasActiveFilters" class="reset-btn" @click="resetFilters">Réinitialiser</button>
      </div>

      <div class="cards-list">
        <template v-if="loading">
          <div v-for="i in 4" :key="i" class="skel-card">
            <div class="skel-photo skeleton"></div>
            <div class="skel-body">
              <div class="skeleton" style="height:13px;width:65%;border-radius:4px"></div>
              <div class="skeleton" style="height:11px;width:45%;border-radius:4px"></div>
            </div>
          </div>
        </template>
        <div v-else-if="!filtered.length" class="empty"><span>🌿</span><p>Aucun jardinier pour ces filtres</p></div>
        <button v-else v-for="user in filtered" :key="user._id" :id="`card-${user._id}`" :class="['scard', { selected: selectedId === user._id }]" @click="selectCard(user)" type="button">
          <div class="scard-photo"><img :src="getAvatar(user._id, user.profil_image?.secure_url)" :alt="`${user.prenom} ${user.nom}`" /></div>
          <div class="scard-body">
            <div class="scard-name">{{ user.prenom }} {{ user.nom }}</div>
            <div class="scard-ville">{{ user.ville }}</div>
            <div v-if="user.numberOfReviews > 0" class="scard-rating">
              <span class="s-full" v-for="i in stars(user.averageRating).full" :key="`f${i}`">★</span>
              <span class="s-empty" v-for="i in stars(user.averageRating).empty" :key="`e${i}`">★</span>
              <span class="scard-rating-val">{{ user.averageRating.toFixed(1) }}</span>
            </div>
          </div>
          <div class="scard-right">
            <span v-if="user.tarifHoraire" class="scard-price">{{ user.tarifHoraire }} €/h</span>
            <a :href="`/prestataires/?id=${user._id}`" class="scard-link" @click.stop>Profil →</a>
          </div>
        </button>
      </div>
    </aside>

    <!-- ── MOBILE LIST VIEW ── -->
    <div v-show="mobileView === 'liste'" class="mobile-list">
      <template v-if="loading">
        <div v-for="i in 5" :key="i" class="skel-card">
          <div class="skel-photo skeleton"></div>
          <div class="skel-body">
            <div class="skeleton" style="height:13px;width:65%;border-radius:4px"></div>
            <div class="skeleton" style="height:11px;width:45%;border-radius:4px"></div>
          </div>
        </div>
      </template>
      <div v-else-if="!filtered.length" class="empty"><span>🌿</span><p>Aucun jardinier pour ces filtres</p></div>
      <a
        v-else
        v-for="user in filtered"
        :key="user._id"
        :href="`/prestataires/?id=${user._id}`"
        class="mobile-card"
      >
        <div class="mobile-card-photo">
          <img :src="getAvatar(user._id, user.profil_image?.secure_url)" :alt="`${user.prenom} ${user.nom}`" />
        </div>
        <div class="mobile-card-body">
          <div class="mobile-card-name">{{ user.prenom }} {{ user.nom }}</div>
          <div class="mobile-card-ville">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg>
            {{ user.ville }}
          </div>
          <div v-if="user.numberOfReviews > 0" class="scard-rating" style="margin-top:0.3rem">
            <span class="s-full" v-for="i in stars(user.averageRating).full" :key="`f${i}`">★</span>
            <span class="s-empty" v-for="i in stars(user.averageRating).empty" :key="`e${i}`">★</span>
            <span class="scard-rating-val">{{ user.averageRating.toFixed(1) }}</span>
            <span class="scard-rating-val" style="color:#9ca3af">({{ user.numberOfReviews }})</span>
          </div>
        </div>
        <div class="scard-right">
          <span v-if="user.tarifHoraire" class="scard-price">{{ user.tarifHoraire }} €/h</span>
          <span class="mobile-card-cta">Voir →</span>
        </div>
      </a>
    </div>

    <!-- ── MAP ── -->
    <div ref="mapEl" :class="['map-area', { 'map-hidden': mobileView === 'liste' }]"></div>

    <!-- ── FILTER DRAWER (mobile) ── -->
    <Transition name="drawer">
      <div v-if="showFilterDrawer" class="drawer-backdrop" @click="showFilterDrawer = false">
        <div class="filter-drawer" @click.stop>
          <div class="drawer-handle"></div>
          <div class="drawer-header">
            <span class="drawer-title">Filtres</span>
            <button class="drawer-close" @click="showFilterDrawer = false" type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="drawer-body">
            <div class="drawer-section">
              <label class="drawer-label">Note minimum</label>
              <div class="rating-group">
                <button v-for="r in RATINGS" :key="r.val" :class="['rating-btn', { active: minRating === r.val }]" @click="minRating = r.val">{{ r.label }}</button>
              </div>
            </div>
            <div class="drawer-section">
              <label class="drawer-label">
                Tarif maximum
                <strong>{{ maxTarif < 150 ? maxTarif + ' €/h' : 'Illimité' }}</strong>
              </label>
              <input type="range" v-model.number="maxTarif" min="20" max="150" step="5" class="range-slider" />
              <div class="range-labels"><span>20 €</span><span>150 €+</span></div>
            </div>
          </div>

          <div class="drawer-footer">
            <button class="drawer-reset" @click="resetFilters(); showFilterDrawer = false" type="button">Réinitialiser</button>
            <button class="drawer-apply" @click="applyFilters(); showFilterDrawer = false" type="button">
              Appliquer les filtres
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.carte-layout {
  display: flex;
  height: calc(100vh - 56px);
  overflow: hidden;
}

/* ── MOBILE STICKY HEADER ── */
.mobile-sticky { display: none; }

/* ── DESKTOP SIDEBAR ── */
.sidebar {
  width: 380px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid #e5e7eb;
  background: #fff;
}

.filters {
  padding: 1.25rem 1.25rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  flex-shrink: 0;
}

.filters h2 { font-size: 1.1rem; font-weight: 800; margin-bottom: 1rem; color: #111827; }

.filter-group { margin-bottom: 0.875rem; }

.filter-label {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 0.75rem; font-weight: 600; color: #6b7280;
  text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.4rem;
}

.filter-value { font-weight: 700; color: #515F37; text-transform: none; letter-spacing: 0; font-size: 0.8rem; }

.search-row { display: flex; gap: 0.4rem; }

.text-input {
  flex: 1; padding: 0.5rem 0.75rem;
  border: 1.5px solid #e5e7eb; border-radius: 8px;
  font-size: 0.875rem; outline: none; transition: border-color 0.15s;
}
.text-input:focus { border-color: #515F37; }

.search-btn {
  width: 36px; height: 36px; background: #515F37; color: #fff;
  border: none; border-radius: 8px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: background 0.15s;
}
.search-btn:hover { background: #3d4a28; }

.chip-group { display: flex; flex-wrap: wrap; gap: 0.3rem; }

.chip {
  padding: 0.3rem 0.7rem; border: 1.5px solid #e5e7eb; border-radius: 999px;
  background: #fff; color: #374151; font-size: 0.78rem; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.chip:hover { border-color: #515F37; color: #515F37; }
.chip.active { background: #515F37; border-color: #515F37; color: #fff; }

.rating-group { display: flex; gap: 0.35rem; }

.rating-btn {
  flex: 1; padding: 0.35rem 0; border: 1.5px solid #e5e7eb; border-radius: 8px;
  background: #fff; color: #374151; font-size: 0.8rem; font-weight: 600;
  cursor: pointer; transition: all 0.15s;
}
.rating-btn:hover { border-color: #515F37; color: #515F37; }
.rating-btn.active { background: #515F37; border-color: #515F37; color: #fff; }

.range-slider { width: 100%; accent-color: #515F37; cursor: pointer; }

.range-labels { display: flex; justify-content: space-between; font-size: 0.72rem; color: #9ca3af; margin-top: 0.2rem; }

.results-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.75rem 1.25rem; border-bottom: 1px solid #f3f4f6;
  font-size: 0.875rem; color: #374151; flex-shrink: 0;
}
.results-header strong { font-weight: 700; color: #111827; }

.loading-text { display: flex; align-items: center; gap: 0.5rem; color: #6b7280; }

.spinner {
  width: 14px; height: 14px; border: 2px solid #e5e7eb; border-top-color: #515F37;
  border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

.reset-btn {
  font-size: 0.75rem; color: #6b7280; background: none; border: none;
  cursor: pointer; padding: 0.25rem 0.5rem; border-radius: 6px; transition: background 0.15s, color 0.15s;
}
.reset-btn:hover { background: #f3f4f6; color: #374151; }

.cards-list { overflow-y: auto; flex: 1; padding: 0.5rem; }

.skel-card { display: flex; gap: 0.75rem; padding: 0.75rem; margin-bottom: 0.25rem; }
.skel-photo { width: 52px; height: 52px; border-radius: 10px; flex-shrink: 0; }
.skel-body { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; padding-top: 0.25rem; }
.skeleton { background: #f3f4f6; animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

.empty { text-align: center; padding: 3rem 1rem; color: #9ca3af; }
.empty span { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }
.empty p { font-size: 0.875rem; }

.scard {
  display: flex; align-items: center; gap: 0.75rem; width: 100%;
  padding: 0.75rem; border: 1.5px solid transparent; border-radius: 12px;
  background: #fff; cursor: pointer; text-align: left;
  transition: border-color 0.15s, background 0.15s; margin-bottom: 0.25rem;
}
.scard:hover { background: #f9fafb; border-color: #e5e7eb; }
.scard.selected { border-color: #515F37; background: #f0ede3; }

.scard-photo { width: 52px; height: 52px; border-radius: 10px; overflow: hidden; flex-shrink: 0; background: linear-gradient(135deg, #f0ede3, #d6cda4); }
.scard-photo img { width: 100%; height: 100%; object-fit: cover; }
.scard-body { flex: 1; min-width: 0; }
.scard-name { font-size: 0.875rem; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.scard-ville { font-size: 0.75rem; color: #9ca3af; margin-top: 0.15rem; }
.scard-rating { display: flex; align-items: center; gap: 1px; font-size: 0.72rem; }
.s-full { color: #f59e0b; }
.s-empty { color: #e5e7eb; }
.scard-rating-val { margin-left: 0.25rem; color: #374151; font-weight: 600; font-size: 0.72rem; }
.scard-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem; flex-shrink: 0; }
.scard-price { font-size: 0.78rem; font-weight: 700; color: #111827; background: #f3f4f6; padding: 0.15rem 0.5rem; border-radius: 6px; }
.scard.selected .scard-price { background: #f0ede3; color: #3d4a28; }
.scard-link { font-size: 0.75rem; color: #515F37; font-weight: 600; text-decoration: none; white-space: nowrap; }
.scard-link:hover { text-decoration: underline; }

/* ── MOBILE LIST ── */
.mobile-list { display: none; }

/* ── MAP ── */
.map-area { flex: 1; height: 100%; z-index: 0; }
.map-hidden { display: none; }

/* ── MOBILE ── */
@media (max-width: 768px) {
  .carte-layout {
    flex-direction: column;
    height: calc(100vh - 56px);
    overflow: hidden;
  }

  /* Show mobile header, hide desktop sidebar */
  .mobile-sticky {
    display: flex;
    flex-direction: column;
    background: #fff;
    border-bottom: 1px solid #e5e2d3;
    flex-shrink: 0;
    z-index: 10;
  }

  .sidebar { display: none; }

  /* Mobile search row */
  .mobile-search-row {
    display: flex;
    gap: 0.5rem;
    padding: 0.625rem 0.875rem;
  }

  .mobile-input-wrap {
    flex: 1;
    position: relative;
  }

  .mobile-input-icon {
    position: absolute;
    left: 0.625rem;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    color: #9ca3af;
    pointer-events: none;
  }

  .mobile-text-input {
    width: 100%;
    padding: 0.55rem 0.75rem 0.55rem 2rem;
    border: 1.5px solid #e5e2d3;
    border-radius: 10px;
    font-size: 0.875rem;
    font-family: inherit;
    outline: none;
    background: #faf8f2;
    color: #1a1a0e;
    transition: border-color 0.15s;
  }
  .mobile-text-input:focus { border-color: #515F37; background: #fff; }

  .mobile-search-btn {
    width: 36px;
    height: 36px;
    background: #515F37;
    color: #fff;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .mobile-filter-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0 0.75rem;
    height: 36px;
    background: #fff;
    border: 1.5px solid #e5e2d3;
    border-radius: 10px;
    color: #374151;
    font-size: 0.8rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    flex-shrink: 0;
    position: relative;
    white-space: nowrap;
  }
  .mobile-filter-btn.has-filters { border-color: #515F37; color: #515F37; }

  .filter-dot {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #515F37;
    border: 1.5px solid #fff;
  }

  /* Service chips */
  .mobile-chips-scroll {
    display: flex;
    gap: 0.4rem;
    padding: 0 0.875rem 0.625rem;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .mobile-chips-scroll::-webkit-scrollbar { display: none; }

  .mobile-chip {
    padding: 0.3rem 0.75rem;
    border: 1.5px solid #e5e2d3;
    border-radius: 999px;
    background: #fff;
    color: #374151;
    font-size: 0.8rem;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all 0.15s;
  }
  .mobile-chip:active { background: #f0ede3; }
  .mobile-chip.active { background: #515F37; border-color: #515F37; color: #fff; }

  /* Tabs */
  .mobile-tabs {
    display: flex;
    border-top: 1px solid #f0ede3;
  }

  .mobile-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.6rem 0;
    background: none;
    border: none;
    font-size: 0.85rem;
    font-weight: 600;
    font-family: inherit;
    color: #9ca3af;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
  }
  .mobile-tab.active { color: #515F37; border-bottom-color: #515F37; }

  .tab-count {
    background: #f0ede3;
    color: #515F37;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
  }
  .mobile-tab.active .tab-count { background: #515F37; color: #fff; }

  /* Mobile list */
  .mobile-list {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    flex: 1;
    background: #faf8f2;
    padding: 0.5rem;
    gap: 0.5rem;
    -webkit-overflow-scrolling: touch;
  }

  .mobile-card {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding: 0.875rem;
    background: #fff;
    border: 1.5px solid #e5e2d3;
    border-radius: 14px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.15s;
  }
  .mobile-card:active { border-color: #d6cda4; background: #faf8f2; }

  .mobile-card-photo {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
    background: linear-gradient(135deg, #f0ede3, #d6cda4);
  }
  .mobile-card-photo img { width: 100%; height: 100%; object-fit: cover; }

  .mobile-card-body { flex: 1; min-width: 0; }
  .mobile-card-name { font-size: 0.9rem; font-weight: 700; color: #1a1a0e; }
  .mobile-card-ville {
    display: flex; align-items: center; gap: 0.25rem;
    font-size: 0.75rem; color: #9ca3af; margin-top: 0.2rem;
  }

  .mobile-card-cta { font-size: 0.75rem; font-weight: 600; color: #515F37; white-space: nowrap; }

  /* Map area */
  .map-area {
    flex: 1;
    min-height: 0;
    width: 100%;
  }
  .map-hidden { display: none !important; }
}

/* ── FILTER DRAWER ── */
.drawer-backdrop {
  display: none;
}

@media (max-width: 768px) {
  .drawer-backdrop {
    display: flex;
    align-items: flex-end;
    position: fixed;
    inset: 0;
    background: rgba(26,26,14,0.4);
    z-index: 500;
  }
}

.filter-drawer {
  width: 100%;
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 0.75rem 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0;
  transform: translateY(0);
}

.drawer-handle {
  width: 40px;
  height: 4px;
  background: #e5e2d3;
  border-radius: 2px;
  margin: 0 auto 1.25rem;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.drawer-title { font-size: 1rem; font-weight: 800; color: #1a1a0e; }

.drawer-close {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  background: #f0ede3; border: none; border-radius: 8px;
  cursor: pointer; color: #515F37;
}

.drawer-body { display: flex; flex-direction: column; gap: 1.25rem; }

.drawer-section { display: flex; flex-direction: column; gap: 0.5rem; }

.drawer-label {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 0.8rem; font-weight: 600; color: #6b7280;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.drawer-label strong { color: #515F37; text-transform: none; letter-spacing: 0; }

.drawer-footer {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.75rem;
  padding-top: 1.25rem;
  border-top: 1px solid #f0ede3;
}

.drawer-reset {
  flex: 1; padding: 0.75rem;
  background: #fff; border: 1.5px solid #e5e2d3;
  border-radius: 12px; color: #6b7280;
  font-size: 0.875rem; font-weight: 600; font-family: inherit;
  cursor: pointer;
}

.drawer-apply {
  flex: 2; padding: 0.75rem;
  background: #515F37; border: none;
  border-radius: 12px; color: #fff;
  font-size: 0.875rem; font-weight: 700; font-family: inherit;
  cursor: pointer;
}

/* Drawer transition */
.drawer-enter-active, .drawer-leave-active { transition: opacity 0.25s; }
.drawer-enter-active .filter-drawer, .drawer-leave-active .filter-drawer { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from .filter-drawer, .drawer-leave-to .filter-drawer { transform: translateY(100%); }
</style>

<!-- Global styles for Leaflet -->
<style>
.gd-marker {
  width: 42px; height: 42px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: #fff; border: 3px solid #515F37;
  overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  transition: transform 0.2s, border-color 0.2s;
}
.gd-marker img, .gd-marker span { display: block; width: 100%; height: 100%; transform: rotate(45deg); }
.gd-marker img { object-fit: cover; }
.gd-marker span { display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: 800; color: #515F37; background: linear-gradient(135deg, #f0ede3, #d6cda4); }
.gd-marker--sel { border-color: #dc2626; transform: rotate(-45deg) scale(1.2); z-index: 1000; }

.gd-popup { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; min-width: 140px; }
.gd-popup strong { font-size: 0.9rem; color: #111827; }
.gd-popup span { color: #6b7280; font-size: 0.8rem; }
.gd-popup-tarif { font-weight: 700; color: #515F37 !important; }
.gd-popup a { color: #515F37; font-weight: 600; font-size: 0.8rem; text-decoration: none; margin-top: 0.25rem; }
.gd-popup a:hover { text-decoration: underline; }

.gd-cluster { width: 44px; height: 44px; border-radius: 50%; background: #515F37; border: 3px solid #fff; box-shadow: 0 2px 10px rgba(81,95,55,0.45); display: flex; align-items: center; justify-content: center; font-weight: 800; color: #fff; font-size: 0.85rem; transition: transform 0.15s; }
.gd-cluster:hover { transform: scale(1.1); }
.gd-cluster--md { width: 50px; height: 50px; background: #3d4a28; font-size: 0.9rem; }
.gd-cluster--lg { width: 58px; height: 58px; background: #1a1a0e; font-size: 1rem; }
.gd-cluster span { line-height: 1; }

.you-marker { width: 16px; height: 16px; border-radius: 50%; background: #3b82f6; border: 3px solid #fff; box-shadow: 0 0 0 3px rgba(59,130,246,0.35), 0 2px 8px rgba(0,0,0,0.25); animation: pulse-you 2s ease-in-out infinite; }
@keyframes pulse-you {
  0%, 100% { box-shadow: 0 0 0 3px rgba(59,130,246,0.35), 0 2px 8px rgba(0,0,0,0.25); }
  50%       { box-shadow: 0 0 0 8px rgba(59,130,246,0.15), 0 2px 8px rgba(0,0,0,0.25); }
}
</style>
