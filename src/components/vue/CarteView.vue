<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
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
const sidebarOpen = ref(true);

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

const selected = computed(() => users.value.find(u => u._id === selectedId.value) ?? null);

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

  // Try to geolocate the user and zoom in
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 12, { duration: 1.2 });

        // Show a small "you are here" marker
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
      () => { /* permission denied or unavailable — keep default France view */ },
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
  flyTo(user);
}

function stars(n: number) {
  return { full: Math.round(n), empty: 5 - Math.round(n) };
}
</script>

<template>
  <div class="carte-layout">
    <!-- ── MOBILE TOGGLE ── -->
    <button class="map-toggle-btn" @click="sidebarOpen = !sidebarOpen" type="button">
      <svg v-if="sidebarOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      {{ sidebarOpen ? 'Masquer les filtres' : `${filtered.length} jardinier${filtered.length > 1 ? 's' : ''} — Voir les filtres` }}
    </button>

    <!-- ── SIDEBAR ── -->
    <aside :class="['sidebar', { 'sidebar--hidden': !sidebarOpen }]">
      <!-- Filters -->
      <div class="filters">
        <h2>Trouver un jardinier</h2>

        <div class="filter-group">
          <label class="filter-label">Ville ou code postal</label>
          <div class="search-row">
            <input
              v-model="ville"
              type="text"
              placeholder="Paris, Lyon, 75001..."
              class="text-input"
              @keyup.enter="applyFilters"
            />
            <button class="search-btn" @click="applyFilters" aria-label="Chercher">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </div>
        </div>

        <div class="filter-group">
          <label class="filter-label">Service</label>
          <div class="chip-group">
            <button
              v-for="cat in categoriesStore.categories"
              :key="cat._id"
              :class="['chip', { active: service === cat._id }]"
              @click="toggleService(cat._id)"
              type="button"
            >{{ cat.name }}</button>
          </div>
        </div>

        <div class="filter-group">
          <label class="filter-label">Note minimum</label>
          <div class="rating-group">
            <button
              v-for="r in RATINGS"
              :key="r.val"
              :class="['rating-btn', { active: minRating === r.val }]"
              @click="minRating = r.val; updateMarkers()"
            >{{ r.label }}</button>
          </div>
        </div>

        <div class="filter-group">
          <label class="filter-label">
            Tarif max
            <span class="filter-value">{{ maxTarif < 150 ? maxTarif + ' €/h' : 'Illimité' }}</span>
          </label>
          <input
            type="range"
            v-model.number="maxTarif"
            min="20"
            max="150"
            step="5"
            class="range-slider"
            @input="updateMarkers"
          />
          <div class="range-labels"><span>20 €</span><span>150 €+</span></div>
        </div>
      </div>

      <!-- Results header -->
      <div class="results-header">
        <span v-if="loading" class="loading-text">
          <span class="spinner"></span> Chargement...
        </span>
        <span v-else>
          <strong>{{ filtered.length }}</strong> jardinier{{ filtered.length > 1 ? 's' : '' }}
        </span>
        <button
          v-if="service || ville || minRating > 0 || maxTarif < 150"
          class="reset-btn"
          @click="service = ''; ville = ''; minRating = 0; maxTarif = 150; applyFilters()"
        >Réinitialiser</button>
      </div>

      <!-- Cards list -->
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

        <div v-else-if="!filtered.length" class="empty">
          <span>🌿</span>
          <p>Aucun jardinier pour ces filtres</p>
        </div>

        <button
          v-else
          v-for="user in filtered"
          :key="user._id"
          :id="`card-${user._id}`"
          :class="['scard', { selected: selectedId === user._id }]"
          @click="selectCard(user)"
          type="button"
        >
          <div class="scard-photo">
            <img :src="getAvatar(user._id, user.profil_image?.secure_url)" :alt="`${user.prenom} ${user.nom}`" />
          </div>
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

    <!-- ── MAP ── -->
    <div ref="mapEl" class="map-area"></div>
  </div>
</template>

<style scoped>
.carte-layout {
  display: flex;
  height: calc(100vh - 68px);
  overflow: hidden;
}

/* ── SIDEBAR ── */
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

.filters h2 {
  font-size: 1.1rem;
  font-weight: 800;
  margin-bottom: 1rem;
  color: #111827;
}

.filter-group { margin-bottom: 0.875rem; }

.filter-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.4rem;
}

.filter-value {
  font-weight: 700;
  color: #515F37;
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.8rem;
}

.search-row {
  display: flex;
  gap: 0.4rem;
}

.text-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
}

.text-input:focus { border-color: #515F37; }

.search-btn {
  width: 36px;
  height: 36px;
  background: #515F37;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s;
}

.search-btn:hover { background: #3d4a28; }

.chip-group { display: flex; flex-wrap: wrap; gap: 0.3rem; }

.chip {
  padding: 0.3rem 0.7rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 999px;
  background: #fff;
  color: #374151;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.chip:hover { border-color: #515F37; color: #515F37; }
.chip.active { background: #515F37; border-color: #515F37; color: #fff; }

.rating-group { display: flex; gap: 0.35rem; }

.rating-btn {
  flex: 1;
  padding: 0.35rem 0;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.rating-btn:hover { border-color: #515F37; color: #515F37; }
.rating-btn.active { background: #515F37; border-color: #515F37; color: #fff; }

.range-slider {
  width: 100%;
  accent-color: #515F37;
  cursor: pointer;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
  color: #9ca3af;
  margin-top: 0.2rem;
}

/* Results header */
.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.875rem;
  color: #374151;
  flex-shrink: 0;
}

.results-header strong { font-weight: 700; color: #111827; }

.loading-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #e5e7eb;
  border-top-color: #515F37;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

@keyframes spin { to { transform: rotate(360deg); } }

.reset-btn {
  font-size: 0.75rem;
  color: #6b7280;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}

.reset-btn:hover { background: #f3f4f6; color: #374151; }

/* Cards list */
.cards-list {
  overflow-y: auto;
  flex: 1;
  padding: 0.5rem;
}

/* Skeleton */
.skel-card {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 0.25rem;
}

.skel-photo {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  flex-shrink: 0;
}

.skel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.25rem;
}

.skeleton {
  background: #f3f4f6;
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

/* Empty */
.empty {
  text-align: center;
  padding: 3rem 1rem;
  color: #9ca3af;
}

.empty span { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }
.empty p { font-size: 0.875rem; }

/* Sidebar card */
.scard {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem;
  border: 1.5px solid transparent;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
  margin-bottom: 0.25rem;
}

.scard:hover { background: #f9fafb; border-color: #e5e7eb; }
.scard.selected { border-color: #515F37; background: #f0ede3; }

.scard-photo {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, #f0ede3, #d6cda4);
}

.scard-photo img { width: 100%; height: 100%; object-fit: cover; }

.scard-initials {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 800;
  color: #515F37;
}

.scard-body { flex: 1; min-width: 0; }
.scard-name { font-size: 0.875rem; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.scard-ville { font-size: 0.75rem; color: #9ca3af; margin-top: 0.15rem; }
.scard-rating { display: flex; align-items: center; gap: 1px; margin-top: 0.3rem; font-size: 0.72rem; }
.s-full { color: #f59e0b; }
.s-empty { color: #e5e7eb; }
.scard-rating-val { margin-left: 0.25rem; color: #374151; font-weight: 600; font-size: 0.72rem; }

.scard-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
  flex-shrink: 0;
}

.scard-price {
  font-size: 0.78rem;
  font-weight: 700;
  color: #111827;
  background: #f3f4f6;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
}

.scard.selected .scard-price {
  background: #f0ede3;
  color: #3d4a28;
}

.scard-link {
  font-size: 0.75rem;
  color: #515F37;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.scard-link:hover { text-decoration: underline; }

/* ── MAP ── */
.map-area {
  flex: 1;
  height: 100%;
  z-index: 0;
}

/* ── MOBILE TOGGLE ── */
.map-toggle-btn { display: none; }

/* ── MOBILE ── */
@media (max-width: 768px) {
  .carte-layout {
    flex-direction: column;
    height: auto;
    min-height: calc(100vh - 56px);
  }

  .map-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1.25rem;
    background: #515F37;
    color: #fff;
    border: none;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    position: sticky;
    top: 56px;
    z-index: 100;
  }
  .map-toggle-btn svg { width: 16px; height: 16px; }

  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e5e2d3;
    max-height: 70vh;
    overflow-y: auto;
    transition: max-height 0.3s ease, opacity 0.3s ease;
  }

  .sidebar--hidden {
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    border-bottom: none;
  }

  .map-area {
    height: 55vh;
    min-height: 300px;
    flex: none;
    width: 100%;
  }
}
</style>

<!-- Global styles for Leaflet custom markers (not scoped) -->
<style>
.gd-marker {
  width: 42px;
  height: 42px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: #fff;
  border: 3px solid #515F37;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  transition: transform 0.2s, border-color 0.2s;
}

.gd-marker img,
.gd-marker span {
  display: block;
  width: 100%;
  height: 100%;
  transform: rotate(45deg);
}

.gd-marker img { object-fit: cover; }

.gd-marker span {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 800;
  color: #515F37;
  background: linear-gradient(135deg, #f0ede3, #d6cda4);
}

.gd-marker--sel {
  border-color: #dc2626;
  transform: rotate(-45deg) scale(1.2);
  z-index: 1000;
}

.gd-popup {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  min-width: 140px;
}

.gd-popup strong { font-size: 0.9rem; color: #111827; }
.gd-popup span { color: #6b7280; font-size: 0.8rem; }
.gd-popup-tarif { font-weight: 700; color: #515F37 !important; }
.gd-popup a { color: #515F37; font-weight: 600; font-size: 0.8rem; text-decoration: none; margin-top: 0.25rem; }
.gd-popup a:hover { text-decoration: underline; }

.gd-cluster {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #515F37;
  border: 3px solid #fff;
  box-shadow: 0 2px 10px rgba(81,95,55,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: #fff;
  font-size: 0.85rem;
  transition: transform 0.15s;
}

.gd-cluster:hover { transform: scale(1.1); }

.gd-cluster--md {
  width: 50px;
  height: 50px;
  background: #3d4a28;
  font-size: 0.9rem;
}

.gd-cluster--lg {
  width: 58px;
  height: 58px;
  background: #1a1a0e;
  font-size: 1rem;
}

.gd-cluster span {
  line-height: 1;
}

.you-marker {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  border: 3px solid #fff;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.35), 0 2px 8px rgba(0,0,0,0.25);
  animation: pulse-you 2s ease-in-out infinite;
}

@keyframes pulse-you {
  0%, 100% { box-shadow: 0 0 0 3px rgba(59,130,246,0.35), 0 2px 8px rgba(0,0,0,0.25); }
  50%       { box-shadow: 0 0 0 8px rgba(59,130,246,0.15), 0 2px 8px rgba(0,0,0,0.25); }
}
</style>
