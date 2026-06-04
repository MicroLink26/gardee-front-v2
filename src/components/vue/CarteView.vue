<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { getRanking } from '../../services/users';
import { useCategoriesStore } from '../../stores/categories';
import { useCategoryName } from '../../composables/useCategoryName';
import { getAvatar } from '../../composables/useAvatar';
import type { User } from '../../types';

const { categoryName } = useCategoryName();

const service = ref('');
const ville = ref('');
const minRating = ref(0);
const maxTarif = ref(150);
const profilTypeFilter = ref<'all' | 'amateur' | 'professionnel'>('all');
const users = ref<User[]>([]);
const loading = ref(false);
const selectedId = ref<string | null>(null);
const profilePanel = ref<User | null>(null);
const mapEl = ref<HTMLDivElement>();

// Location gate
const showLocationGate = ref(false);
const locationInput = ref('');
const locationGateLoading = ref(false);

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
let youMarker: any = null;
const locating = ref(false);

const categoriesStore = useCategoriesStore();
const sortBy = ref<'note' | 'prix' | 'distance'>('note');
const sortDir = ref<'asc' | 'desc'>('desc');
const userPosition = ref<{ lat: number; lng: number } | null>(null);

const SORTS = [
  { val: 'note' as const, label: 'Note' },
  { val: 'prix' as const, label: 'Prix' },
  { val: 'distance' as const, label: 'Distance' },
];

const DEFAULT_DIR: Record<string, 'asc' | 'desc'> = {
  note: 'desc',
  prix: 'asc',
  distance: 'asc',
};

function setSortBy(val: 'note' | 'prix' | 'distance') {
  if (val === 'distance' && !userPosition.value) { locateMe(); return; }
  if (sortBy.value === val) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = val;
    sortDir.value = DEFAULT_DIR[val];
  }
}

const RATINGS = [
  { label: 'Toutes', val: 0 },
  { label: '3+', val: 3 },
  { label: '4+', val: 4 },
  { label: '4.5+', val: 4.5 },
];

const filtered = computed(() =>
  users.value.filter(u => {
    if (minRating.value > 0 && (u.averageRating ?? 0) < minRating.value) return false;
    if (maxTarif.value < 150 && u.tarifHoraire && u.tarifHoraire > maxTarif.value) return false;
    if (profilTypeFilter.value === 'professionnel' && !u.prestataire?.isEntrepreneur) return false;
    if (profilTypeFilter.value === 'amateur' && u.prestataire?.isEntrepreneur) return false;
    return true;
  })
);

const hasActiveFilters = computed(() =>
  !!(service.value || ville.value || minRating.value > 0 || maxTarif.value < 150 || profilTypeFilter.value !== 'all')
);

function geoDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const sortedAndFiltered = computed(() => {
  const arr = [...filtered.value];
  const dir = sortDir.value === 'asc' ? 1 : -1;
  if (sortBy.value === 'note') {
    return arr.sort((a, b) => dir * ((a.averageRating ?? 0) - (b.averageRating ?? 0)));
  }
  if (sortBy.value === 'prix') {
    return arr.sort((a, b) => {
      if (!a.tarifHoraire) return 1;
      if (!b.tarifHoraire) return -1;
      return dir * (a.tarifHoraire - b.tarifHoraire);
    });
  }
  if (sortBy.value === 'distance' && userPosition.value) {
    const { lat, lng } = userPosition.value;
    return arr.sort((a, b) => {
      const dA = a.location ? geoDistance(lat, lng, a.location.coordinates[1], a.location.coordinates[0]) : Infinity;
      const dB = b.location ? geoDistance(lat, lng, b.location.coordinates[1], b.location.coordinates[0]) : Infinity;
      return dir * (dA - dB);
    });
  }
  return arr;
});

async function load() {
  loading.value = true;
  try {
    const data = await getRanking({
      prestation: service.value || undefined,
      ville: ville.value || undefined,
      pageSize: 100,
    });
    users.value = data.items;
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
          <button class="gd-popup-btn" data-id="${user._id}">Voir le profil →</button>
        </div>
      `)
      .on('popupopen', () => {
        const btn = document.querySelector(`.gd-popup-btn[data-id="${user._id}"]`);
        btn?.addEventListener('click', () => openProfilePanel(user), { once: true });
      })
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

function locateMe() {
  if (!navigator.geolocation || !map) return;
  locating.value = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      userPosition.value = { lat: latitude, lng: longitude };
      map.flyTo([latitude, longitude], 13, { duration: 1.0 });
      if (youMarker) map.removeLayer(youMarker);
      const youIcon = L.divIcon({
        html: '<div class="you-marker"></div>',
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      youMarker = L.marker([latitude, longitude], { icon: youIcon })
        .addTo(map)
        .bindPopup('<div class="gd-popup"><strong>Votre position</strong></div>');
      sortBy.value = 'distance';
      sortDir.value = 'asc';
      locating.value = false;
    },
    () => { locating.value = false; },
    { timeout: 8000, maximumAge: 60000 }
  );
}

onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const villeParam = urlParams.get('ville');
  const prestationParam = urlParams.get('prestation');
  if (villeParam) ville.value = villeParam;

  await categoriesStore.load();

  if (prestationParam) {
    const match = categoriesStore.categories.find(c =>
      c.name.toLowerCase().includes(prestationParam.toLowerCase())
    );
    if (match) service.value = match._id;
  }

  L = (await import('leaflet')).default;
  await import('leaflet/dist/leaflet.css');
  await import('leaflet.markercluster');
  await import('leaflet.markercluster/dist/MarkerCluster.css');
  await import('leaflet.markercluster/dist/MarkerCluster.Default.css');

  map = L.map(mapEl.value!).setView([46.8, 2.3], 6);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  await load();
  updateMarkers();

  // Ask for geolocation; if denied, show location gate
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        userPosition.value = { lat: latitude, lng: longitude };
        map.flyTo([latitude, longitude], 12, { duration: 1.2 });
        const youIcon = L.divIcon({ html: '<div class="you-marker"></div>', className: '', iconSize: [16, 16], iconAnchor: [8, 8] });
        if (youMarker) map.removeLayer(youMarker);
        youMarker = L.marker([latitude, longitude], { icon: youIcon }).addTo(map).bindPopup('<div class="gd-popup"><strong>Votre position</strong></div>');
        sortBy.value = 'distance';
        sortDir.value = 'asc';
      },
      () => {
        // Geolocation denied — show location gate only if no URL params already set
        if (!villeParam && !prestationParam) {
          showLocationGate.value = true;
        }
      },
      { timeout: 5000, maximumAge: 60000 }
    );
  }
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

async function selectCard(user: User) {
  selectedId.value = user._id;
  mobileView.value = 'carte';
  await nextTick();
  flyTo(user);
}

function resetFilters() {
  service.value = '';
  ville.value = '';
  minRating.value = 0;
  maxTarif.value = 150;
  profilTypeFilter.value = 'all';
  applyFilters();
}

function openProfilePanel(user: User) {
  profilePanel.value = user;
}

async function submitLocationGate() {
  const input = locationInput.value.trim();
  if (!input) return;
  locationGateLoading.value = true;
  ville.value = input;
  showLocationGate.value = false;
  locationGateLoading.value = false;
  await load();
  updateMarkers();
  // Try to zoom to the typed city via Nominatim
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)},France&format=json&limit=1`);
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    if (data[0] && map) {
      map.flyTo([parseFloat(data[0].lat), parseFloat(data[0].lon)], 11, { duration: 1.2 });
    }
  } catch { /* non bloquant */ }
}

function setMinRating(val: number) {
  minRating.value = val;
  updateMarkers();
}

function setMaxTarif(val: number) {
  maxTarif.value = val;
  updateMarkers();
}

function stars(n: number) {
  return { full: Math.round(n), empty: 5 - Math.round(n) };
}
</script>

<template>
  <!-- ── LOCATION GATE ── -->
  <Transition name="gate">
    <div v-if="showLocationGate" class="location-gate">
      <div class="gate-card">
        <div class="gate-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <h2>Où cherchez-vous un jardinier ?</h2>
        <p>Entrez votre ville ou code postal pour trouver les prestataires près de chez vous.</p>
        <form @submit.prevent="submitLocationGate" class="gate-form">
          <div class="gate-row">
            <input
              v-model="locationInput"
              type="text"
              placeholder="Paris, 75001, Lyon…"
              class="gate-input"
              autofocus
            />
            <button type="submit" class="gate-btn" :disabled="!locationInput.trim() || locationGateLoading">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </div>
          <div class="gate-cats">
            <button
              v-for="cat in categoriesStore.categories.slice(0, 5)"
              :key="cat._id"
              type="button"
              :class="['gate-chip', { active: service === cat._id }]"
              @click="service = service === cat._id ? '' : cat._id"
            >{{ cat.name }}</button>
          </div>
        </form>
        <button class="gate-skip" @click="showLocationGate = false" type="button">
          Voir toute la France →
        </button>
      </div>
    </div>
  </Transition>

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
            <button v-for="r in RATINGS" :key="r.val" :class="['rating-btn', { active: minRating === r.val }]" @click="setMinRating(r.val)">{{ r.label }}</button>
          </div>
        </div>

        <div class="filter-group">
          <label class="filter-label">Type de profil</label>
          <div class="rating-group">
            <button :class="['rating-btn', { active: profilTypeFilter === 'all' }]" @click="profilTypeFilter = 'all'; updateMarkers()">Tous</button>
            <button :class="['rating-btn', { active: profilTypeFilter === 'amateur' }]" @click="profilTypeFilter = 'amateur'; updateMarkers()">Amateur</button>
            <button :class="['rating-btn', { active: profilTypeFilter === 'professionnel' }]" @click="profilTypeFilter = 'professionnel'; updateMarkers()">Pro</button>
          </div>
        </div>

        <div class="filter-group">
          <label class="filter-label">
            Tarif max
            <span class="filter-value">{{ maxTarif < 150 ? maxTarif + ' €/h' : 'Illimité' }}</span>
          </label>
          <input type="range" :value="maxTarif" min="20" max="150" step="5" class="range-slider" @input="setMaxTarif(+($event.target as HTMLInputElement).value)" />
          <div class="range-labels"><span>20 €</span><span>150 €+</span></div>
        </div>
      </div>

      <div class="results-header">
        <span v-if="loading" class="loading-text"><span class="spinner"></span> Chargement...</span>
        <span v-else><strong>{{ filtered.length }}</strong> jardinier{{ filtered.length > 1 ? 's' : '' }}</span>
        <button v-if="hasActiveFilters" class="reset-btn" @click="resetFilters">Réinitialiser</button>
      </div>

      <div class="sort-bar">
        <button
          v-for="s in SORTS"
          :key="s.val"
          :class="['sort-btn', { active: sortBy === s.val, disabled: s.val === 'distance' && !userPosition }]"
          :title="s.val === 'distance' && !userPosition ? 'Activez la géolocalisation pour trier par distance' : ''"
          @click="setSortBy(s.val)"
          type="button"
        >
          {{ s.label }}
          <span class="sort-dir-icon" v-if="sortBy === s.val">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
        </button>
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
        <div v-else-if="!sortedAndFiltered.length" class="empty"><span>🌿</span><p>Aucun jardinier pour ces filtres</p></div>
        <button v-else v-for="user in sortedAndFiltered" :key="user._id" :id="`card-${user._id}`" :class="['scard', { selected: selectedId === user._id }]" @click="selectCard(user)" type="button">
          <div class="scard-photo"><img :src="getAvatar(user._id, user.profil_image?.secure_url)" :alt="`${user.prenom} ${user.nom}`" /></div>
          <div class="scard-body">
            <div class="scard-name">{{ user.prenom }} {{ user.nom }}</div>
            <div class="scard-ville">{{ user.ville }}</div>
            <div v-if="user.numberOfReviews > 0" class="scard-rating">
              <span class="s-full" v-for="i in stars(user.averageRating).full" :key="`f${i}`">★</span>
              <span class="s-empty" v-for="i in stars(user.averageRating).empty" :key="`e${i}`">★</span>
              <span class="scard-rating-val">{{ user.averageRating.toFixed(1) }}</span>
            </div>
            <div v-if="user.prestations?.length" class="scard-services">
              <span v-for="p in user.prestations.slice(0, 2)" :key="p">{{ categoryName(p) }}</span>
              <span v-if="user.prestations.length > 2" class="scard-more">+{{ user.prestations.length - 2 }}</span>
            </div>
          </div>
          <div class="scard-right">
            <span v-if="user.tarifHoraire" class="scard-price">{{ user.tarifHoraire }} €/h</span>
            <button class="scard-link" @click.stop="openProfilePanel(user)" type="button">Profil →</button>
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
      <div v-else-if="!sortedAndFiltered.length" class="empty"><span>🌿</span><p>Aucun jardinier pour ces filtres</p></div>
      <div
        v-else
        v-for="user in sortedAndFiltered"
        :key="user._id"
        class="mobile-card"
        @click="selectCard(user)"
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
          <a :href="`/prestataires/${user._id}`" class="mobile-card-cta" @click.stop>Voir →</a>
        </div>
      </div>
    </div>

    <!-- ── MAP ── -->
    <div :class="['map-wrapper', { 'map-hidden': mobileView === 'liste' }]">
      <div ref="mapEl" class="map-area"></div>
      <button class="locate-btn" :class="{ locating }" @click="locateMe" type="button" :title="locating ? 'Localisation…' : 'Ma position'">
        <svg v-if="!locating" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
          <circle cx="12" cy="12" r="8" stroke-dasharray="2 2"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20" class="spin-icon">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      </button>
    </div>

    <!-- ── PROFILE PANEL (right) ── -->
    <Transition name="panel">
      <div v-if="profilePanel" class="profile-panel">
        <div class="pp-header">
          <button class="pp-close" @click="profilePanel = null" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="pp-body">
          <div class="pp-photo">
            <img :src="getAvatar(profilePanel._id, profilePanel.profil_image?.secure_url)" :alt="`${profilePanel.prenom} ${profilePanel.nom}`" />
          </div>
          <h3 class="pp-name">{{ profilePanel.prenom }} {{ profilePanel.nom }}</h3>
          <p class="pp-ville">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg>
            {{ profilePanel.ville }}
          </p>
          <div v-if="(profilePanel.numberOfReviews ?? 0) > 0" class="pp-rating">
            <span class="s-full" v-for="i in stars(profilePanel.averageRating ?? 0).full" :key="`f${i}`">★</span>
            <span class="s-empty" v-for="i in stars(profilePanel.averageRating ?? 0).empty" :key="`e${i}`">★</span>
            <span class="pp-rating-val">{{ (profilePanel.averageRating ?? 0).toFixed(1) }}</span>
            <span class="pp-rating-count">({{ profilePanel.numberOfReviews }} avis)</span>
          </div>
          <div v-if="profilePanel.tarifHoraire" class="pp-tarif">{{ profilePanel.tarifHoraire }} €/h</div>
          <div class="pp-services">
            <span v-for="p in (profilePanel.prestations ?? [])" :key="p" class="pp-service-chip">{{ categoryName(p) }}</span>
          </div>
          <a :href="`/prestataires/${profilePanel._id}/`" class="pp-cta">
            Voir le profil complet
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
        </div>
      </div>
    </Transition>

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
              <label class="drawer-label">Type de profil</label>
              <div class="rating-group">
                <button :class="['rating-btn', { active: profilTypeFilter === 'all' }]" @click="profilTypeFilter = 'all'">Tous</button>
                <button :class="['rating-btn', { active: profilTypeFilter === 'amateur' }]" @click="profilTypeFilter = 'amateur'">Amateur</button>
                <button :class="['rating-btn', { active: profilTypeFilter === 'professionnel' }]" @click="profilTypeFilter = 'professionnel'">Pro</button>
              </div>
            </div>
            <div class="drawer-section">
              <label class="drawer-label">Note minimum</label>
              <div class="rating-group">
                <button v-for="r in RATINGS" :key="r.val" :class="['rating-btn', { active: minRating === r.val }]" @click="setMinRating(r.val)">{{ r.label }}</button>
              </div>
            </div>
            <div class="drawer-section">
              <label class="drawer-label">
                Tarif maximum
                <strong>{{ maxTarif < 150 ? maxTarif + ' €/h' : 'Illimité' }}</strong>
              </label>
              <input type="range" :value="maxTarif" min="20" max="150" step="5" class="range-slider" @input="setMaxTarif(+($event.target as HTMLInputElement).value)" />
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
  border-right: 1px solid #e9e5d6;
  background: #faf8f2;
}

.filters {
  padding: 1.25rem 1.25rem 0.75rem;
  border-bottom: 1px solid #e9e5d6;
  flex-shrink: 0;
  background: #faf8f2;
}

.filters h2 {
  font-size: 0.95rem; font-weight: 800; margin-bottom: 1rem; color: #3a5020;
  text-transform: uppercase; letter-spacing: 0.07em;
  display: flex; align-items: center; gap: 0.5rem;
}
.filters h2::before {
  content: '';
  display: inline-block; width: 3px; height: 1em;
  background: #a8c47a; border-radius: 2px;
}

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
  border: 1.5px solid #e9e5d6; border-radius: 8px;
  font-size: 0.875rem; outline: none; transition: border-color 0.15s;
  background: #f5f2eb;
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
  padding: 0.3rem 0.7rem; border: 1.5px solid #e9e5d6; border-radius: 999px;
  background: #f5f2eb; color: #515F37; font-size: 0.78rem; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.chip:hover { border-color: #a8c47a; background: #eef2e8; }
.chip.active { background: #515F37; border-color: #515F37; color: #fff; }

.rating-group { display: flex; gap: 0.35rem; }

.rating-btn {
  flex: 1; padding: 0.35rem 0; border: 1.5px solid #e9e5d6; border-radius: 8px;
  background: #f5f2eb; color: #515F37; font-size: 0.8rem; font-weight: 600;
  cursor: pointer; transition: all 0.15s;
}
.rating-btn:hover { border-color: #a8c47a; background: #eef2e8; }
.rating-btn.active { background: #515F37; border-color: #515F37; color: #fff; }

.range-slider { width: 100%; accent-color: #515F37; cursor: pointer; }

.range-labels { display: flex; justify-content: space-between; font-size: 0.72rem; color: #9ca3af; margin-top: 0.2rem; }

.results-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.75rem 1.25rem; border-bottom: 1px solid #e9e5d6;
  font-size: 0.875rem; color: #515F37; flex-shrink: 0;
  background: #faf8f2;
}
.results-header strong { font-weight: 700; color: #3a5020; }

.loading-text { display: flex; align-items: center; gap: 0.5rem; color: #6b7280; }

.spinner {
  width: 14px; height: 14px; border: 2px solid #e9e5d6; border-top-color: #515F37;
  border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

.reset-btn {
  font-size: 0.75rem; color: #6b7280; background: none; border: none;
  cursor: pointer; padding: 0.25rem 0.5rem; border-radius: 6px; transition: background 0.15s, color 0.15s;
}
.reset-btn:hover { background: #f0ede3; color: #3a5020; }

.sort-bar {
  display: flex; gap: 0.35rem; padding: 0.5rem 1.25rem 0;
  flex-shrink: 0; background: #faf8f2;
}
.sort-btn {
  padding: 0.3rem 0.8rem;
  border: 1.5px solid #e9e5d6; border-radius: 999px;
  background: #f5f2eb; color: #515F37;
  font-size: 0.75rem; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.sort-btn:hover { border-color: #a8c47a; background: #eef2e8; }
.sort-btn.active { background: #3a5020; border-color: #3a5020; color: #fff; }
.sort-btn.disabled { opacity: 0.5; cursor: default; }
.sort-btn.disabled:hover { border-color: #e9e5d6; background: #f5f2eb; }
.sort-dir-icon { font-size: 0.7rem; margin-left: 0.15rem; opacity: 0.85; }

.cards-list { overflow-y: auto; flex: 1; padding: 0.5rem; background: #f2efe6; }

.skel-card { display: flex; gap: 0.75rem; padding: 0.75rem; margin-bottom: 0.25rem; }
.skel-photo { width: 52px; height: 52px; border-radius: 10px; flex-shrink: 0; }
.skel-body { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; padding-top: 0.25rem; }
.skeleton {
  background: linear-gradient(90deg, #e9e5d6 25%, #f0ede3 50%, #e9e5d6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty { text-align: center; padding: 3rem 1rem; color: #9ca3af; }
.empty span { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }
.empty p { font-size: 0.875rem; }

.scard {
  display: flex; align-items: center; gap: 0.75rem; width: 100%;
  padding: 0.75rem; border: 1.5px solid #ede9dc; border-radius: 12px;
  background: #FCFAF5; cursor: pointer; text-align: left;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s; margin-bottom: 0.25rem;
}
.scard:hover { background: #faf8f2; border-color: #c8d9a6; box-shadow: 0 2px 8px rgba(58,80,32,0.08); }
.scard.selected { border-color: #515F37; background: #f0ede3; box-shadow: 0 2px 10px rgba(58,80,32,0.12); }

.scard-photo { width: 52px; height: 52px; border-radius: 10px; overflow: hidden; flex-shrink: 0; background: linear-gradient(135deg, #f0ede3, #d6cda4); }
.scard-photo img { width: 100%; height: 100%; object-fit: cover; }
.scard-body { flex: 1; min-width: 0; }
.scard-name { font-size: 0.875rem; font-weight: 700; color: #1a1a0e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.scard-ville { font-size: 0.75rem; color: #9ca3af; margin-top: 0.15rem; }
.scard-rating { display: flex; align-items: center; gap: 1px; font-size: 0.72rem; }
.s-full { color: #e6c553; }
.s-empty { color: #e0dbd0; }
.scard-rating-val { margin-left: 0.25rem; color: #515F37; font-weight: 600; font-size: 0.72rem; }
.scard-services {
  display: flex; flex-wrap: wrap; gap: 0.2rem; margin-top: 0.3rem;
}
.scard-services span {
  font-size: 0.65rem; color: #6b6347;
  background: #f0ede3; border: 1px solid #d6cda4;
  padding: 0.08rem 0.4rem; border-radius: 999px;
}
.scard-more { color: #9ca3af !important; background: transparent !important; border-color: transparent !important; }
.scard-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem; flex-shrink: 0; }
.scard-price { font-size: 0.78rem; font-weight: 700; color: #3a5020; background: rgba(168,196,122,0.15); padding: 0.15rem 0.5rem; border-radius: 6px; border: 1px solid rgba(168,196,122,0.3); }
.scard.selected .scard-price { background: rgba(168,196,122,0.25); border-color: #a8c47a; color: #3a5020; }
.scard-link { font-size: 0.75rem; color: #515F37; font-weight: 600; text-decoration: none; white-space: nowrap; }
.scard-link:hover { text-decoration: underline; }

/* ── MOBILE LIST ── */
.mobile-list { display: none; }

/* ── MAP ── */
.map-wrapper { flex: 1; position: relative; }
.map-wrapper.map-hidden { display: none; }
.map-area { width: 100%; height: 100%; z-index: 0; }

.locate-btn {
  position: absolute;
  bottom: 2rem;
  right: 1rem;
  z-index: 1000;
  width: 44px;
  height: 44px;
  background: #FCFAF5;
  border: 2px solid #e9e5d6;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #515F37;
  box-shadow: 0 2px 8px rgba(58,80,32,0.18);
}
.locate-btn:hover { background: #f0ede3; border-color: #a8c47a; }
.locate-btn.locating { color: #9ca3af; cursor: default; }
.spin-icon { animation: spin 0.9s linear infinite; }

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
    background: #FCFAF5;
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
  .mobile-text-input:focus { border-color: #515F37; background: #FCFAF5; }

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
    background: #FCFAF5;
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
    background: #FCFAF5;
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
    background: #FCFAF5;
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
  .map-wrapper {
    flex: 1;
    min-height: 0;
    width: 100%;
  }
  .map-wrapper.map-hidden { display: none !important; }
  .locate-btn { bottom: 1rem; }
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
  background: #FCFAF5;
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
  background: #FCFAF5; border: 1.5px solid #e5e2d3;
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

/* Profile panel */
.profile-panel {
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 320px;
  background: #FCFAF5;
  border-left: 1px solid #e9e5d6;
  box-shadow: -8px 0 32px rgba(0,0,0,0.12);
  z-index: 400;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.pp-header {
  display: flex;
  justify-content: flex-end;
  padding: 0.75rem 0.875rem 0;
  position: sticky;
  top: 0;
  background: #FCFAF5;
  z-index: 1;
}
.pp-close {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  background: #f0ede3; border: none; border-radius: 8px;
  cursor: pointer; color: #6b7280; transition: background 0.15s;
}
.pp-close:hover { background: #e2dece; color: #374151; }
.pp-body {
  padding: 0.5rem 1.25rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
}
.pp-photo {
  width: 88px; height: 88px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #e9e5d6;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
}
.pp-photo img { width: 100%; height: 100%; object-fit: cover; }
.pp-name { font-size: 1.05rem; font-weight: 800; color: #1a1a0e; margin: 0; }
.pp-ville {
  display: flex; align-items: center; gap: 0.3rem;
  font-size: 0.8rem; color: #9ca3af;
}
.pp-rating {
  display: flex; align-items: center; gap: 0.2rem;
  font-size: 0.85rem;
}
.pp-rating-val { font-weight: 700; color: #1a1a0e; }
.pp-rating-count { font-size: 0.75rem; color: #9ca3af; }
.pp-tarif {
  font-size: 1.1rem; font-weight: 800; color: #3a5020;
  background: rgba(58,80,32,0.08);
  padding: 0.3rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(58,80,32,0.15);
}
.pp-services {
  display: flex; flex-wrap: wrap; gap: 0.3rem;
  justify-content: center;
}
.pp-service-chip {
  background: #f0ede3; color: #515F37;
  border: 1px solid #d6cda4;
  padding: 0.18rem 0.6rem;
  border-radius: 999px;
  font-size: 0.72rem; font-weight: 600;
}
.pp-cta {
  display: flex; align-items: center; gap: 0.4rem; justify-content: center;
  margin-top: 0.75rem;
  background: #3a5020; color: #fff;
  text-decoration: none;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 700; font-size: 0.875rem;
  transition: background 0.15s;
  width: 100%;
}
.pp-cta:hover { background: #2a3c16; }

/* Panel transition */
.panel-enter-active, .panel-leave-active { transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1); }
.panel-enter-from, .panel-leave-to { transform: translateX(100%); }

/* Location gate */
.location-gate {
  position: fixed; inset: 0; z-index: 800;
  background: linear-gradient(135deg, #1a2410 0%, #253515 50%, #3a5020 100%);
  display: flex; align-items: center; justify-content: center;
  padding: 1.5rem;
}
.gate-card {
  background: #FCFAF5; border-radius: 24px;
  padding: 2.5rem 2rem; max-width: 480px; width: 100%;
  box-shadow: 0 32px 80px rgba(0,0,0,0.3);
  text-align: center;
}
.gate-icon {
  width: 72px; height: 72px; border-radius: 50%;
  background: rgba(58,80,32,0.1); color: #3a5020;
  border: 2px solid rgba(58,80,32,0.18);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1.25rem;
}
.gate-card h2 { font-size: 1.25rem; font-weight: 900; color: #1a1a0e; margin: 0 0 0.625rem; }
.gate-card p { font-size: 0.9rem; color: #6b7280; line-height: 1.6; margin: 0 0 1.5rem; }
.gate-form { display: flex; flex-direction: column; gap: 0.875rem; }
.gate-row { display: flex; gap: 0.5rem; }
.gate-input {
  flex: 1; padding: 0.875rem 1rem;
  border: 1.5px solid #e9e5d6; border-radius: 12px;
  font-size: 1rem; color: #1a1a0e; background: #f5f2eb;
  outline: none; font-family: inherit;
  transition: border-color 0.15s;
}
.gate-input:focus { border-color: #3a5020; background: #FCFAF5; }
.gate-btn {
  width: 52px; height: 52px; border-radius: 12px;
  background: #3a5020; color: #fff; border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; transition: background 0.15s;
}
.gate-btn:hover:not(:disabled) { background: #2a3c16; }
.gate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.gate-cats { display: flex; flex-wrap: wrap; gap: 0.4rem; justify-content: center; }
.gate-chip {
  padding: 0.3rem 0.875rem;
  border: 1.5px solid #e9e5d6; border-radius: 999px;
  background: #f5f2eb; color: #515F37;
  font-size: 0.8rem; font-weight: 600; cursor: pointer;
  transition: all 0.15s; font-family: inherit;
}
.gate-chip:hover { border-color: #3a5020; color: #3a5020; }
.gate-chip.active { background: #3a5020; border-color: #3a5020; color: #fff; }
.gate-skip {
  display: block; margin-top: 1.25rem;
  background: none; border: none; color: #9ca3af;
  font-size: 0.85rem; cursor: pointer; font-family: inherit;
  transition: color 0.15s;
}
.gate-skip:hover { color: #6b7280; }

/* Gate transition */
.gate-enter-active, .gate-leave-active { transition: opacity 0.3s ease; }
.gate-enter-from, .gate-leave-to { opacity: 0; }

/* Profile panel — full screen on mobile */
@media (max-width: 600px) {
  .profile-panel { width: 100%; left: 0; right: 0; top: 0; }
  .panel-enter-from, .panel-leave-to { transform: translateY(100%); }
}

/* Popup button style */
.gd-popup-btn {
  display: block; width: 100%;
  background: #3a5020; color: #fff; border: none; border-radius: 6px;
  padding: 0.4rem 0.75rem; font-size: 0.78rem; font-weight: 700;
  cursor: pointer; margin-top: 0.4rem; font-family: inherit;
}
.gd-popup-btn:hover { background: #2a3c16; }
</style>

<!-- Global styles for Leaflet -->
<style>
.gd-marker {
  width: 42px; height: 42px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: #FCFAF5; border: 3px solid #515F37;
  overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  transition: transform 0.2s, border-color 0.2s;
}
.gd-marker img, .gd-marker span { display: block; width: 100%; height: 100%; transform: rotate(45deg); }
.gd-marker img { object-fit: cover; }
.gd-marker span { display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: 800; color: #515F37; background: linear-gradient(135deg, #f0ede3, #d6cda4); }
.gd-marker--sel { border-color: #e6c553; transform: rotate(-45deg) scale(1.2); z-index: 1000; box-shadow: 0 4px 16px rgba(230,197,83,0.5); }

.gd-popup { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; min-width: 140px; }
.gd-popup strong { font-size: 0.9rem; color: #1a1a0e; }
.gd-popup span { color: #515F37; font-size: 0.8rem; }
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
