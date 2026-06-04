<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, onUnmounted } from 'vue';
import { getRanking } from '../../services/users';
import { useCategoryName } from '../../composables/useCategoryName';
import { getAvatar } from '../../composables/useAvatar';
import type { User } from '../../types';

const { categoryName, categoriesStore } = useCategoryName();

const users = ref<User[]>([]);
const total = ref(0);
const platformTotal = ref(0);
const page = ref(1);
const pageSize = 50;
const prestation = ref('');
const ville = ref('');
const minRating = ref(0);
const maxTarif = ref(200);
const sortBy = ref<'rating' | 'price' | 'reviews'>('rating');
const loading = ref(false);

const resultsRef = ref<HTMLElement | null>(null);

const RATINGS = [
  { label: 'Toutes', val: 0 },
  { label: '3+', val: 3 },
  { label: '4+', val: 4 },
  { label: '4.5+', val: 4.5 },
];

const filtered = computed(() => {
  let list = users.value.filter(u => {
    if (minRating.value > 0 && (!u.numberOfReviews || (u.averageRating ?? 0) < minRating.value)) return false;
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

onMounted(async () => {
  categoriesStore.load();
  const q = new URLSearchParams(window.location.search).get('q');
  if (q) prestation.value = q;
  // Fetch platform total (no filters) once
  getRanking({ pageSize: 1 }).then(d => { platformTotal.value = d.total; }).catch(() => {});
  load();
});

const PODIUM_RANK = [2, 1, 3];

// Hover aperçu étendu (1.5s hover)
const hoveredId = ref<string | null>(null);
const pinnedId = ref<string | null>(null);
let hoverTimer: ReturnType<typeof setTimeout> | null = null;

function onCardMouseenter(id: string) {
  hoverTimer = setTimeout(() => { hoveredId.value = id; }, 1500);
}
function onCardMouseleave() {
  if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
  hoveredId.value = null;
}
function onCardClick(id: string) {
  pinnedId.value = pinnedId.value === id ? null : id;
}

// Top-3 intro animation
const podiumIntroActive = ref(false);
const podiumIntroStep = ref(0); // 0=idle, 1=show#3, 2=show#2, 3=show#1-big, 4=settle
const podiumIntroTimers: ReturnType<typeof setTimeout>[] = [];

function runPodiumIntro() {
  if (podiumIntroActive.value) return;
  podiumIntroActive.value = true;
  podiumIntroStep.value = 1;
  podiumIntroTimers.push(setTimeout(() => { podiumIntroStep.value = 2; }, 600));
  podiumIntroTimers.push(setTimeout(() => { podiumIntroStep.value = 3; }, 1200));
  podiumIntroTimers.push(setTimeout(() => { podiumIntroStep.value = 4; }, 2000));
  podiumIntroTimers.push(setTimeout(() => {
    podiumIntroActive.value = false;
    podiumIntroStep.value = 0;
  }, 2800));
}

let podiumObs: IntersectionObserver | null = null;
const podiumSectionRef = ref<HTMLElement | null>(null);

function initPodiumIntroObserver() {
  nextTick(() => {
    if (!podiumSectionRef.value) return;
    podiumObs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          runPodiumIntro();
          podiumObs?.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    podiumObs.observe(podiumSectionRef.value);
  });
}

watch(users, () => {
  if (users.value.length >= 3) initPodiumIntroObserver();
});

onUnmounted(() => {
  podiumIntroTimers.forEach(clearTimeout);
  podiumObs?.disconnect();
});

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

let revealObs: IntersectionObserver | null = null;

function observeReveal() {
  nextTick(() => {
    if (!revealObs) {
      revealObs = new IntersectionObserver(
        (entries) => entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            revealObs!.unobserve(e.target);
          }
        }),
        { threshold: 0.08, rootMargin: '0px 0px -20px 0px' }
      );
    }
    document.querySelectorAll('.rank-card.reveal:not(.visible), .podium-card.reveal:not(.visible)').forEach(el => revealObs!.observe(el));
  });
}

watch(users, observeReveal);
onMounted(observeReveal);
</script>

<template>
  <div class="classement-page">

    <!-- ══ HERO ═══════════════════════════════════════════════════ -->
    <section class="page-hero">
      <div class="hero-deco" aria-hidden="true">
        <svg class="leaf leaf-a" viewBox="0 0 220 300" xmlns="http://www.w3.org/2000/svg">
          <path d="M110,8 C175,8 212,65 212,150 C212,235 175,292 110,292 C45,292 8,235 8,150 C8,65 45,8 110,8Z" fill="rgba(168,196,122,0.07)"/>
        </svg>
        <svg class="leaf leaf-b" viewBox="0 0 180 260" xmlns="http://www.w3.org/2000/svg">
          <path d="M90,6 C148,6 174,58 174,130 C174,202 148,254 90,254 C32,254 6,202 6,130 C6,58 32,6 90,6Z" fill="rgba(255,255,255,0.04)"/>
        </svg>
        <div class="deco-ring deco-ring-a"></div>
        <div class="deco-ring deco-ring-b"></div>
      </div>

      <div class="container">
        <div class="hero-text">
          <span class="eyebrow">Classement 2025</span>
          <h1>Les <em class="hero-accent">meilleurs</em> jardiniers</h1>
          <p class="hero-sub">Découvrez les prestataires les mieux notés près de chez vous</p>
        </div>

        <div class="filters-panel">
          <div class="search-row">
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input
                v-model="ville"
                type="text"
                placeholder="Ville ou code postal…"
                class="text-input"
                @keyup.enter="search"
              />
            </div>
            <button class="search-btn" @click="search">Rechercher</button>
            <a :href="carteUrl" class="map-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
              Carte
            </a>
          </div>

          <div class="chip-scroll-wrap">
            <div class="chip-group">
              <button
                v-for="cat in categoriesStore.categories" :key="cat._id"
                :class="['chip', { 'chip--on': prestation === cat._id }]"
                @click="toggleService(cat._id)"
                type="button"
              >{{ cat.name }}</button>
            </div>
            <div class="chip-fade"></div>
          </div>

          <div class="filter-row">
            <div class="filter-block">
              <span class="filter-label">Note minimum</span>
              <div class="btn-group">
                <button
                  v-for="r in RATINGS" :key="r.val"
                  :class="['fbtn', { 'fbtn--on': minRating === r.val }]"
                  @click="minRating = r.val"
                >{{ r.label }}</button>
              </div>
            </div>
            <div class="filter-block">
              <span class="filter-label">
                Tarif max :
                <strong>{{ maxTarif === 200 ? 'Tous' : maxTarif + ' €/h' }}</strong>
              </span>
              <input type="range" v-model.number="maxTarif" min="15" max="200" step="5" class="range-input" />
            </div>
            <div class="filter-block">
              <span class="filter-label">Trier par</span>
              <div class="btn-group">
                <button :class="['fbtn', { 'fbtn--on': sortBy === 'rating' }]"   @click="sortBy = 'rating'">Note</button>
                <button :class="['fbtn', { 'fbtn--on': sortBy === 'price' }]"    @click="sortBy = 'price'">Prix</button>
                <button :class="['fbtn', { 'fbtn--on': sortBy === 'reviews' }]"  @click="sortBy = 'reviews'">Avis</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ CONTENT ════════════════════════════════════════════════ -->
    <div ref="resultsRef" class="container main-content">

      <!-- Meta -->
      <div class="results-meta">
        <span v-if="loading" class="meta-loading">
          <span class="spinner"></span> Chargement…
        </span>
        <template v-else>
          <div class="meta-count-wrap">
            <span class="meta-count">
              <template v-if="prestation || ville || minRating > 0 || maxTarif < 200">
                <strong>{{ total }}</strong> résultat{{ total > 1 ? 's' : '' }}
                <template v-if="prestation"> · {{ categoryName(prestation) }}</template>
                <template v-if="ville"> · {{ ville }}</template>
              </template>
              <template v-else>
                <strong>{{ platformTotal || total }}</strong> prestataire{{ (platformTotal || total) > 1 ? 's' : '' }} sur la plateforme
              </template>
            </span>
          </div>
          <button
            v-if="prestation || ville || minRating > 0 || maxTarif < 200"
            class="reset-btn"
            @click="resetFilters"
          >Réinitialiser ×</button>
        </template>
      </div>

      <!-- Skeleton -->
      <template v-if="loading">
        <div class="podium-grid">
          <div v-for="i in 3" :key="i" class="podium-card skel-card">
            <div class="skel" style="height:200px"></div>
            <div style="padding:1rem;display:flex;flex-direction:column;gap:0.5rem">
              <div class="skel" style="height:13px;width:60%;border-radius:4px"></div>
              <div class="skel" style="height:11px;width:40%;border-radius:4px"></div>
            </div>
          </div>
        </div>
        <div class="rank-list">
          <div v-for="i in 6" :key="i" class="skel" style="height:76px;border-radius:14px"></div>
        </div>
      </template>

      <template v-else>
        <!-- Empty -->
        <div v-if="!filtered.length" class="empty">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <h3>Aucun jardinier trouvé</h3>
          <p>Essayez d'autres filtres ou une autre ville</p>
          <button class="btn-primary" @click="resetFilters">Voir tous les jardiniers</button>
        </div>

        <template v-else>

          <!-- ── Podium ── -->
          <div v-if="showPodium" class="podium-section" ref="podiumSectionRef">
            <h2 class="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M8 21h8m-4-4v4M6.5 3h11L19 9c0 3.31-3.13 6-7 6s-7-2.69-7-6l1.5-6zM3 9h3m15 0h-3"/></svg>
              Podium
            </h2>
            <div :class="['podium-grid', { 'podium-intro': podiumIntroActive }]">
              <a
                v-for="(user, i) in podiumOrder"
                :key="user._id"
                :href="`/prestataires/${user._id}/`"
                :class="[
                  'podium-card', 'reveal', podiumClass(i),
                  { 'podium-first': PODIUM_RANK[i] === 1 },
                  { 'pi-hidden': podiumIntroActive && podiumIntroStep < (PODIUM_RANK[i] === 3 ? 1 : PODIUM_RANK[i] === 2 ? 2 : 3) },
                  { 'pi-featured': podiumIntroActive && podiumIntroStep === 3 && PODIUM_RANK[i] === 1 },
                  { 'pi-settling': podiumIntroActive && podiumIntroStep === 4 },
                ]"
                :style="`transition-delay:${podiumIntroActive ? 0 : i * 0.1}s`"
              >
                <div class="podium-photo">
                  <img :src="getAvatar(user._id, user.profil_image?.secure_url)" :alt="`${user.prenom} ${user.nom}`" loading="lazy" />
                  <div class="podium-overlay"></div>
                  <div class="podium-badge">
                    <span class="podium-medal">{{ podiumMedal(i) }}</span>
                    <span class="podium-rank">#{{ PODIUM_RANK[i] }}</span>
                  </div>
                  <span v-if="user.tarifHoraire" class="price-badge">{{ user.tarifHoraire }} €/h</span>
                  <div class="podium-identity">
                    <h3>{{ user.prenom }} {{ user.nom }}</h3>
                    <p class="podium-ville">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="10" height="10"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg>
                      {{ user.ville }}
                    </p>
                  </div>
                </div>
                <div class="podium-body">
                  <div v-if="user.numberOfReviews > 0" class="podium-rating">
                    <span class="sf"><span v-for="j in stars(user.averageRating).full"  :key="`f${j}`">★</span></span>
                    <span class="se"><span v-for="j in stars(user.averageRating).empty" :key="`e${j}`">★</span></span>
                    <span class="rv">{{ user.averageRating.toFixed(1) }}</span>
                    <span class="rc">{{ user.numberOfReviews }} avis</span>
                  </div>
                  <div v-else class="podium-rating">
                    <span class="new-badge">Nouveau</span>
                  </div>
                  <div class="podium-tags">
                    <span v-for="p in user.prestations" :key="p" class="tag">{{ categoryName(p) }}</span>
                  </div>
                </div>
              </a>
            </div>
          </div>

          <!-- ── Suite du classement ── -->
          <div v-if="listItems.length > 0">
            <h2 class="section-title" style="margin-top: 2.5rem">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              {{ showPodium ? 'Suite du classement' : page > 1 ? `Page ${page}` : 'Classement' }}
            </h2>
            <div class="rank-list">
              <div
                v-for="(user, i) in listItems"
                :key="user._id"
                :class="['rank-card', 'reveal', { 'rank-card--expanded': hoveredId === user._id || pinnedId === user._id }]"
                :style="`transition-delay:${Math.min(i * 0.06, 0.4)}s`"
                @mouseenter="onCardMouseenter(user._id)"
                @mouseleave="onCardMouseleave"
                @click="onCardClick(user._id)"
              >
                <span class="rank-num">{{ listRankStart + i }}</span>
                <div class="rank-photo">
                  <img :src="getAvatar(user._id, user.profil_image?.secure_url)" :alt="`${user.prenom} ${user.nom}`" loading="lazy" />
                </div>
                <div class="rank-body">
                  <div class="rank-name">{{ user.prenom }} {{ user.nom }}</div>
                  <div class="rank-ville">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg>
                    {{ user.ville }}
                  </div>
                  <div v-if="user.numberOfReviews > 0" class="rank-rating">
                    <span class="sf"><span v-for="j in stars(user.averageRating).full"  :key="`f${j}`">★</span></span>
                    <span class="se"><span v-for="j in stars(user.averageRating).empty" :key="`e${j}`">★</span></span>
                    <span class="rv-sm">{{ user.averageRating.toFixed(1) }}</span>
                    <span class="rc-sm">({{ user.numberOfReviews }} avis)</span>
                  </div>
                  <div class="rank-tags">
                    <span v-for="p in user.prestations" :key="p" class="tag-sm">{{ categoryName(p) }}</span>
                  </div>
                  <!-- Aperçu étendu (hover ou clic) -->
                  <div v-if="hoveredId === user._id || pinnedId === user._id" class="rank-preview">
                    <div v-if="user.tarifHoraire" class="preview-tarif">{{ user.tarifHoraire }} €/h</div>
                    <div v-if="user.prestations.length" class="preview-services">
                      <span v-for="p in user.prestations.slice(0, 4)" :key="p" class="preview-chip">{{ categoryName(p) }}</span>
                      <span v-if="user.prestations.length > 4" class="preview-chip preview-chip--more">+{{ user.prestations.length - 4 }}</span>
                    </div>
                    <a :href="`/prestataires/${user._id}/`" class="preview-cta" @click.stop>
                      Voir la page du profil →
                    </a>
                  </div>
                </div>
                <div class="rank-right">
                  <span v-if="user.tarifHoraire && hoveredId !== user._id && pinnedId !== user._id" class="rank-price">{{ user.tarifHoraire }} €/h</span>
                  <span v-if="hoveredId !== user._id && pinnedId !== user._id" class="rank-cta">
                    Voir le profil
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="11" height="11"><polyline points="9 18 15 12 9 6"/></svg>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Top 50 notice -->
          <div v-if="total > 50 && filtered.length >= 50" class="top50-notice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Seuls les <strong>50 meilleurs jardiniers</strong> sont affichés dans ce classement.
          </div>

        </template>
      </template>

    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.classement-page { background: #f2efe6; min-height: 100vh; }
.container { max-width: 1100px; margin: 0 auto; padding: 0 2rem; }

/* ══ HERO ═══════════════════════════════════════════════════════ */
.page-hero {
  position: relative;
  background: linear-gradient(155deg, #141f0b 0%, #253515 55%, #3a5020 100%);
  padding: 3.5rem 0 2.5rem;
  overflow: hidden;
}

.hero-deco { position: absolute; inset: 0; pointer-events: none; }
.leaf { position: absolute; }
.leaf-a { width: 280px; height: 380px; right: -60px; top: -80px; }
.leaf-b { width: 200px; height: 290px; left: -80px; bottom: -100px; }
.deco-ring { position: absolute; border-radius: 50%; border: 1px solid rgba(255,255,255,0.055); }
.deco-ring-a { width: 480px; height: 480px; top: -200px; right: -80px; }
.deco-ring-b { width: 300px; height: 300px; bottom: -150px; left: -60px; }

.hero-text { position: relative; z-index: 1; margin-bottom: 2rem; }

.eyebrow {
  display: inline-block;
  font-size: 0.68rem; font-weight: 700; letter-spacing: 0.16em;
  text-transform: uppercase; color: rgba(214,205,164,0.75);
  background: rgba(214,205,164,0.1); border: 1px solid rgba(214,205,164,0.2);
  padding: 0.28rem 0.8rem; border-radius: 999px; margin-bottom: 0.75rem;
}

.page-hero h1 {
  font-size: clamp(1.9rem, 4vw, 2.8rem); font-weight: 900; color: #fff;
  margin: 0 0 0.5rem; letter-spacing: -0.035em; line-height: 1.08;
}
.hero-accent { color: #a8c47a; font-style: italic; }
.hero-sub { color: rgba(255,255,255,0.55); font-size: 1rem; margin: 0; }

/* Filters panel */
.filters-panel {
  position: relative; z-index: 1;
  background: rgba(255,255,255,0.09);
  border: 1px solid rgba(255,255,255,0.13);
  border-radius: 20px;
  padding: 1.375rem;
  display: flex; flex-direction: column; gap: 1.1rem;
  backdrop-filter: blur(10px);
}

.search-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }

.input-wrap { position: relative; flex: 1; min-width: 200px; max-width: 340px; }
.input-icon {
  position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%);
  width: 15px; height: 15px; color: #9ca3af; pointer-events: none;
}
.text-input {
  width: 100%; padding: 0.65rem 0.875rem 0.65rem 2.2rem;
  border: 1.5px solid rgba(255,255,255,0.18); border-radius: 12px;
  font-size: 0.9rem; outline: none;
  background: rgba(255,255,255,0.95); color: #1a1a0e;
  transition: border-color 0.15s; font-family: inherit;
}
.text-input:focus { border-color: #a8c47a; }
.text-input::placeholder { color: #9ca3af; }

.search-btn {
  padding: 0.65rem 1.375rem; background: #a8c47a; color: #1a1a0e;
  border: none; border-radius: 12px; font-weight: 700; font-size: 0.875rem;
  cursor: pointer; transition: background 0.15s; white-space: nowrap; font-family: inherit;
}
.search-btn:hover { background: #94b366; }

.map-btn {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.65rem 1.1rem;
  background: transparent; color: rgba(255,255,255,0.75);
  border: 1.5px solid rgba(255,255,255,0.2); border-radius: 12px;
  font-weight: 600; font-size: 0.875rem;
  cursor: pointer; text-decoration: none; transition: all 0.15s; white-space: nowrap;
}
.map-btn:hover { color: #a8c47a; border-color: #a8c47a; }

.chip-scroll-wrap { position: relative; }
.chip-fade { display: none; }
.chip-group {
  display: flex; flex-wrap: wrap; gap: 0.45rem; padding-bottom: 2px;
}
.chip {
  padding: 0.35rem 0.9rem;
  border: 1.5px solid rgba(255,255,255,0.18); border-radius: 999px;
  background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.75);
  font-size: 0.8rem; font-weight: 500; cursor: pointer; white-space: nowrap; flex-shrink: 0;
  transition: all 0.15s; font-family: inherit;
}
.chip:hover { border-color: #a8c47a; color: #a8c47a; }
.chip--on { background: #a8c47a; border-color: #a8c47a; color: #1a1a0e; font-weight: 700; }

.filter-row { display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: flex-start; }
.filter-block { display: flex; flex-direction: column; gap: 0.45rem; }
.filter-label {
  font-size: 0.72rem; font-weight: 600; color: rgba(255,255,255,0.55);
  letter-spacing: 0.07em; text-transform: uppercase;
}
.filter-label strong { color: #a8c47a; font-weight: 700; }

.btn-group { display: flex; gap: 0.3rem; }
.fbtn {
  padding: 0.3rem 0.75rem;
  border: 1.5px solid rgba(255,255,255,0.18); border-radius: 8px;
  background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.75);
  font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.fbtn:hover { border-color: #a8c47a; color: #a8c47a; }
.fbtn--on { background: #a8c47a; border-color: #a8c47a; color: #1a1a0e; }

.range-input { width: 160px; accent-color: #a8c47a; cursor: pointer; }

/* ══ MAIN ════════════════════════════════════════════════════════ */
.main-content { padding-top: 1.75rem; padding-bottom: 5rem; }

.results-meta {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 1.75rem; min-height: 28px;
}
.meta-count-wrap { display: flex; flex-direction: column; gap: 0.1rem; }
.meta-count { font-size: 0.875rem; color: #515F37; }
.meta-count strong { font-weight: 700; }
.meta-loading { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #6b7280; }
.spinner {
  width: 14px; height: 14px; border: 2px solid #e5e7eb; border-top-color: #515F37;
  border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }
.reset-btn {
  font-size: 0.78rem; color: #515F37; background: none;
  border: 1.5px solid #d6cda4; border-radius: 999px; padding: 0.3rem 0.9rem;
  cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.reset-btn:hover { background: #d6cda4; }

/* Section title */
.section-title {
  font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: #515F37; margin: 0 0 1.25rem;
  display: flex; align-items: center; gap: 0.6rem;
}
.section-title::after { content: ''; flex: 1; height: 1px; background: #e5e2d3; }

/* Empty */
.empty { text-align: center; padding: 5rem 2rem; }
.empty-icon {
  width: 80px; height: 80px; background: rgba(81,95,55,0.08); border-radius: 24px;
  display: flex; align-items: center; justify-content: center; color: #515F37;
  margin: 0 auto 1.5rem;
}
.empty h3 { font-size: 1.2rem; font-weight: 800; color: #1a1a0e; margin-bottom: 0.5rem; }
.empty p { color: #6b7280; margin-bottom: 1.5rem; }
.btn-primary {
  padding: 0.7rem 1.75rem; background: #3a5020; color: #fff;
  border: none; border-radius: 12px; font-weight: 700; cursor: pointer;
  transition: background 0.15s; font-family: inherit;
}
.btn-primary:hover { background: #2a3c16; }

/* ══ PODIUM ══════════════════════════════════════════════════════ */
.podium-section { margin-bottom: 0; }

.podium-grid {
  display: grid;
  grid-template-columns: 1fr 1.1fr 1fr;
  gap: 1rem;
  align-items: end;
}

/* ── Podium intro animation ── */
.podium-card { transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s, border-color 0.18s, opacity 0.4s, scale 0.5s; }
.pi-hidden { opacity: 0; transform: translateY(40px) scale(0.85); pointer-events: none; }
.pi-featured {
  transform: translateY(-18px) scale(1.08) !important;
  box-shadow: 0 32px 64px rgba(212,168,51,0.35) !important;
  z-index: 10; position: relative;
}
.pi-settling { transition: transform 0.6s ease, box-shadow 0.4s ease, opacity 0.4s, scale 0.5s; }

.podium-card {
  display: flex; flex-direction: column;
  border-radius: 20px; overflow: hidden;
  text-decoration: none; color: inherit;
  border: 2px solid #e5e2d3; background: #FCFAF5;
  transition: transform 0.22s, box-shadow 0.22s, border-color 0.18s;
}
.podium-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 48px rgba(81,95,55,0.16);
}
.podium-card.medal-gold   { border-color: #d4a833; box-shadow: 0 4px 20px rgba(212,168,51,0.2); }
.podium-card.medal-silver { border-color: #9fb0be; }
.podium-card.medal-bronze { border-color: #b8743a; }
.podium-card.podium-first {
  border-color: #d4a833;
  box-shadow: 0 6px 30px rgba(212,168,51,0.28);
}

/* Photo */
.podium-photo {
  position: relative; height: 190px;
  background: linear-gradient(135deg, #dde6c8, #c8d9a6);
  overflow: hidden; flex-shrink: 0;
}
.podium-first .podium-photo { height: 220px; }
.podium-photo img {
  width: 100%; height: 100%; object-fit: cover; object-position: top;
  transition: transform 0.38s;
}
.podium-card:hover .podium-photo img { transform: scale(1.07); }

.podium-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.75) 100%);
  pointer-events: none;
}

.podium-badge {
  position: absolute; top: 10px; left: 10px; z-index: 2;
  display: flex; align-items: center; gap: 0.3rem;
}
.podium-medal { font-size: 1.5rem; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }
.podium-rank {
  font-size: 0.72rem; font-weight: 800; color: rgba(0,0,0,0.55);
  background: rgba(255,255,255,0.9); padding: 0.15rem 0.45rem; border-radius: 999px;
}

.price-badge {
  position: absolute; top: 10px; right: 10px; z-index: 2;
  background: rgba(20,35,26,0.88); color: #d6cda4;
  padding: 0.25rem 0.68rem; border-radius: 999px;
  font-size: 0.75rem; font-weight: 700; backdrop-filter: blur(4px);
}

.podium-identity {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 0.875rem 1rem 0.8rem; z-index: 1;
}
.podium-identity h3 {
  font-size: 0.95rem; font-weight: 800; color: #fff; margin: 0 0 0.2rem;
  letter-spacing: -0.01em; text-shadow: 0 1px 5px rgba(0,0,0,0.25);
}
.podium-ville {
  display: flex; align-items: center; gap: 0.28rem;
  color: rgba(255,255,255,0.8); font-size: 0.75rem; margin: 0;
}

/* Body */
.podium-body { padding: 0.875rem 1rem 1rem; display: flex; flex-direction: column; gap: 0.55rem; }

.podium-rating { display: flex; align-items: center; gap: 0.25rem; }
.sf { color: #e6c553; font-size: 0.82rem; letter-spacing: -1px; }
.se { color: #e0dbd0; font-size: 0.82rem; letter-spacing: -1px; }
.rv { font-size: 0.82rem; font-weight: 800; color: #1a1a0e; margin-left: 0.1rem; }
.rc { font-size: 0.72rem; color: #9ca3af; }
.new-badge {
  font-size: 0.7rem; font-weight: 700; color: #515F37;
  background: rgba(81,95,55,0.08); border: 1px solid rgba(81,95,55,0.18);
  border-radius: 999px; padding: 0.15rem 0.6rem;
}

.podium-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; justify-content: center; width: 100%; }
.tag {
  padding: 0.25rem 0.65rem; border: 1.5px solid #e9e5d6; border-radius: 999px;
  background: #f5f2eb; color: #515F37;
  font-size: 0.75rem; font-weight: 500;
  white-space: normal; word-break: break-word;
}

/* ══ RANK LIST ═══════════════════════════════════════════════════ */
.rank-list { display: flex; flex-direction: column; gap: 0.6rem; }

.rank-card {
  display: flex; align-items: center; gap: 1rem;
  padding: 0.9rem 1.125rem;
  background: #FCFAF5; border: 1.5px solid #e5e2d3; border-radius: 14px;
  color: inherit; cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.2s, transform 0.15s;
  position: relative;
}
.rank-card--expanded {
  align-items: flex-start;
  border-color: #a8c47a;
  box-shadow: 0 6px 24px rgba(58,80,32,0.12);
  transform: translateX(4px);
}
.rank-card--expanded::before { width: 3px; }

/* Aperçu étendu */
.rank-preview {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e9e5d6;
  display: flex; flex-direction: column; gap: 0.5rem;
}
.preview-tarif { font-size: 1rem; font-weight: 800; color: #3a5020; }
.preview-services { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.preview-chip {
  background: rgba(58,80,32,0.08); color: #3a5020;
  border: 1px solid rgba(58,80,32,0.2);
  padding: 0.18rem 0.55rem; border-radius: 999px;
  font-size: 0.72rem; font-weight: 600;
}
.preview-chip--more { background: #f0ede3; color: #9ca3af; border-color: #d6cda4; }
.preview-cta {
  display: inline-flex; align-items: center;
  background: #3a5020; color: #fff;
  text-decoration: none; padding: 0.5rem 1rem;
  border-radius: 8px; font-size: 0.8rem; font-weight: 700;
  transition: background 0.15s; width: fit-content;
}
.preview-cta:hover { background: #2a3c16; }
.rank-card::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 0;
  background: #3a5020; border-radius: 14px 0 0 14px;
  transition: width 0.18s; pointer-events: none;
}
.rank-card:hover {
  border-color: #b8c89a;
  box-shadow: 0 4px 18px rgba(81,95,55,0.1);
  transform: translateX(4px);
}
.rank-card:hover::before { width: 3px; }

.rank-num {
  font-size: 0.8rem; font-weight: 800; color: #ccc8b8;
  width: 26px; text-align: center; flex-shrink: 0;
}

.rank-photo {
  width: 56px; height: 56px; border-radius: 50%; overflow: hidden; flex-shrink: 0;
  background: linear-gradient(135deg, #eae8de, #d6cda4);
}
.rank-photo img { width: 100%; height: 100%; object-fit: cover; }

.rank-body { flex: 1; min-width: 0; overflow: hidden; }
.rank-name { font-size: 0.9rem; font-weight: 700; color: #1a1a0e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rank-ville {
  display: flex; align-items: center; gap: 0.25rem;
  font-size: 0.75rem; color: #9ca3af; margin-top: 0.1rem;
}
.rank-rating { display: flex; align-items: center; gap: 1px; margin-top: 0.3rem; }
.rv-sm { font-size: 0.72rem; font-weight: 700; color: #515F37; margin-left: 0.2rem; }
.rc-sm { font-size: 0.68rem; color: #9ca3af; }
.rank-tags {
  display: flex; flex-wrap: wrap; gap: 0.3rem;
  margin-top: 0.4rem; width: 100%;
}
.tag-sm {
  padding: 0.25rem 0.65rem; border: 1.5px solid #e9e5d6; border-radius: 999px;
  background: #f5f2eb; color: #515F37;
  font-size: 0.75rem; font-weight: 500;
  white-space: normal; word-break: break-word;
}

.rank-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem; flex-shrink: 0; }
.rank-price { font-size: 0.875rem; font-weight: 800; color: #3a5020; }
.rank-cta {
  display: flex; align-items: center; gap: 0.2rem;
  font-size: 0.75rem; font-weight: 600; color: #9ca3af;
  transition: color 0.15s;
}
.rank-cta svg { transition: transform 0.15s; }
.rank-card:hover .rank-cta { color: #3a5020; }
.rank-card:hover .rank-cta svg { transform: translateX(3px); }

/* ══ PAGINATION ══════════════════════════════════════════════════ */
.top50-notice {
  display: flex; align-items: center; gap: 0.5rem; justify-content: center;
  margin-top: 2.5rem; padding: 1rem 1.5rem;
  background: #f5f2eb; border: 1px solid #ddd8c8; border-radius: 14px;
  font-size: 0.85rem; color: #6b6347;
}
.top50-notice svg { color: #a8c47a; flex-shrink: 0; }

.pagination {
  display: flex; align-items: center; justify-content: center;
  gap: 0.75rem; margin-top: 3rem; flex-wrap: wrap;
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
.pag-indicator { display: none; font-size: 0.875rem; font-weight: 600; color: #515F37; }

/* Skeleton */
.skel-card { background: #FCFAF5; border: 1.5px solid #e9e5d6; border-radius: 20px; overflow: hidden; }
.skel {
  background: linear-gradient(90deg, #f3f0e8 25%, #ebe7dc 50%, #f3f0e8 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ══ RESPONSIVE ══════════════════════════════════════════════════ */
@media (max-width: 768px) {
  .container { padding: 0 1rem; }
  .filter-row { flex-direction: column; gap: 1rem; }
  .search-row { flex-direction: column; }
  .input-wrap { max-width: 100%; }
  .map-btn { display: none; }
  .pag-nums { display: none; }
  .pag-indicator { display: block; }
  /* Chips en scroll horizontal sur mobile */
  .chip-group { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px; }
  .chip-group::-webkit-scrollbar { display: none; }
}
@media (max-width: 600px) {
  .podium-grid { grid-template-columns: 1fr; align-items: unset; }
  .podium-card.podium-first { order: -1; }
}
</style>
