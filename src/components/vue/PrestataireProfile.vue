<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getPrestataire, getReviews } from '../../services/users';
import { createRequest } from '../../services/requests';
import AvatarImage from './AvatarImage.vue';
import { useCategoriesStore } from '../../stores/categories';
import type { User } from '../../types';

const categoriesStore = useCategoriesStore();

const props = defineProps<{ prestataireId?: string }>();

const resolvedId = typeof window !== 'undefined'
  ? (props.prestataireId || new URLSearchParams(window.location.search).get('id') || '')
  : (props.prestataireId ?? '');

const user = ref<User | null>(null);
const reviews = ref<Record<string, unknown>[]>([]);
const totalReviews = ref(0);
const loadingReviews = ref(false);
const reviewPage = ref(1);
const formSent = ref(false);
const formError = ref('');
const sending = ref(false);
const activeTab = ref<'about' | 'reviews'>('about');

const form = ref({
  requesterEmail: '',
  requesterPrenom: '',
  requesterNom: '',
  prestations: [] as string[],
  description: '',
  desiredAt: '',
});

// ── Calendar ──────────────────────────────────────
const today = new Date();
today.setHours(0, 0, 0, 0);

const calYear = ref(today.getFullYear());
const calMonth = ref(today.getMonth());

const calMonthLabel = computed(() =>
  new Date(calYear.value, calMonth.value).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
);

const calDays = computed(() => {
  const firstDayOfWeek = (new Date(calYear.value, calMonth.value, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(calYear.value, calMonth.value + 1, 0).getDate();
  const days: ({ day: number; date: Date; past: boolean; selected: boolean; isToday: boolean } | null)[] = [];

  for (let i = 0; i < firstDayOfWeek; i++) days.push(null);

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(calYear.value, calMonth.value, d);
    const iso = date.toISOString().split('T')[0];
    days.push({
      day: d,
      date,
      past: date < today,
      selected: form.value.desiredAt === iso,
      isToday: date.getTime() === today.getTime(),
    });
  }
  return days;
});

const canGoPrev = computed(() =>
  calYear.value > today.getFullYear() || calMonth.value > today.getMonth()
);

function prevMonth() {
  if (!canGoPrev.value) return;
  if (calMonth.value === 0) { calMonth.value = 11; calYear.value--; }
  else calMonth.value--;
}

function nextMonth() {
  if (calMonth.value === 11) { calMonth.value = 0; calYear.value++; }
  else calMonth.value++;
}

function selectDay(d: { day: number; date: Date; past: boolean } | null) {
  if (!d || d.past) return;
  form.value.desiredAt = d.date.toISOString().split('T')[0];
}

const selectedDateLabel = computed(() => {
  if (!form.value.desiredAt) return null;
  return new Date(form.value.desiredAt + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
});

// ── Data loading ──────────────────────────────────
const categoryName = computed(() => {
  const map = new Map(categoriesStore.categories.map(c => [c._id, c.name]));
  return (id: string) => map.get(id) ?? id;
});

onMounted(async () => {
  const id = props.prestataireId || new URLSearchParams(window.location.search).get('id') || '';
  if (!id) return;
  const [u, r] = await Promise.all([
    getPrestataire(id),
    getReviews(id, { pageSize: 5 }),
    categoriesStore.load(),
  ]);
  user.value = u;
  reviews.value = r.items as Record<string, unknown>[];
  totalReviews.value = r.total;
});

async function loadMoreReviews() {
  if (!user.value) return;
  loadingReviews.value = true;
  reviewPage.value++;
  try {
    const id = props.prestataireId || new URLSearchParams(window.location.search).get('id') || '';
    const r = await getReviews(id, { page: reviewPage.value, pageSize: 5 });
    reviews.value.push(...(r.items as Record<string, unknown>[]));
  } finally {
    loadingReviews.value = false;
  }
}

// ── Booking ───────────────────────────────────────
function toggleService(s: string) {
  const idx = form.value.prestations.indexOf(s);
  if (idx >= 0) form.value.prestations.splice(idx, 1);
  else form.value.prestations.push(s);
}

async function submitRequest() {
  if (!form.value.requesterEmail) { formError.value = 'Votre email est requis.'; return; }
  if (!form.value.desiredAt) { formError.value = 'Veuillez choisir une date.'; return; }
  formError.value = '';
  sending.value = true;
  try {
    await createRequest({
      prestataireId: props.prestataireId,
      ...form.value,
      subject: form.value.prestations.join(', ') || undefined,
    });
    formSent.value = true;
  } catch {
    formError.value = 'Une erreur est survenue. Veuillez réessayer.';
  } finally {
    sending.value = false;
  }
}

// ── Helpers ───────────────────────────────────────
function starsArr(n: number) {
  const full = Math.round(n);
  return { full, empty: 5 - full };
}

function reviewAvg(r: Record<string, unknown>) {
  const d = r.ratingDetails as Record<string, number> | undefined;
  if (!d) return 0;
  const vals = Object.values(d).filter(v => typeof v === 'number');
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

const DAYS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
</script>

<template>
  <div v-if="!user" class="loading-state">
    <div class="spinner"></div>
  </div>

  <div v-else class="profile-page">

    <!-- ── HERO ── -->
    <div class="hero-cover" :style="user.profil_image?.secure_url ? `background-image:url(${user.profil_image.secure_url})` : ''">
      <div class="hero-overlay"></div>
    </div>

    <div class="container">
      <div class="profile-header">
        <div class="profile-avatar">
          <AvatarImage :userId="user._id" :prenom="user.prenom" :nom="user.nom" :imageUrl="user.profil_image?.secure_url" :alt="`${user.prenom} ${user.nom}`" />
        </div>

        <div class="profile-meta">
          <div class="profile-name-row">
            <h1>{{ user.prenom }} {{ user.nom }}</h1>
            <span class="badge-verified">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Vérifié
            </span>
          </div>
          <p class="profile-ville">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {{ user.ville }}
          </p>

          <div v-if="user.numberOfReviews > 0" class="profile-rating">
            <span class="stars-full">{{ '★'.repeat(starsArr(user.averageRating).full) }}</span>
            <span class="stars-empty">{{ '★'.repeat(starsArr(user.averageRating).empty) }}</span>
            <span class="rating-score">{{ user.averageRating.toFixed(1) }}</span>
            <span class="rating-count">· {{ user.numberOfReviews }} avis</span>
          </div>

          <div class="profile-tags">
            <span v-for="p in user.prestations" :key="p" class="tag">{{ categoryName(p) }}</span>
          </div>
        </div>

        <div v-if="user.tarifHoraire" class="tarif-badge">
          <span class="tarif-val">{{ user.tarifHoraire }} €</span>
          <span class="tarif-unit">/ heure</span>
        </div>
      </div>

      <!-- ── BODY ── -->
      <div class="profile-body">

        <!-- Left: content -->
        <div class="profile-content">

          <!-- Tabs -->
          <div class="tabs">
            <button :class="['tab', { active: activeTab === 'about' }]" @click="activeTab = 'about'">À propos</button>
            <button :class="['tab', { active: activeTab === 'reviews' }]" @click="activeTab = 'reviews'">
              Avis <span class="tab-count">{{ totalReviews }}</span>
            </button>
          </div>

          <!-- About -->
          <div v-if="activeTab === 'about'">
            <div v-if="user.description" class="content-section">
              <h2>Présentation</h2>
              <p class="description-text">{{ user.description }}</p>
            </div>

            <div class="content-section">
              <h2>Services proposés</h2>
              <div class="services-grid">
                <div v-for="p in user.prestations" :key="p" class="service-item">
                  <div class="service-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <span>{{ categoryName(p) }}</span>
                </div>
              </div>
            </div>

            <div class="content-section">
              <h2>Informations</h2>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Zone d'intervention</span>
                  <span class="info-val">{{ user.ville }} et alentours</span>
                </div>
                <div v-if="user.tarifHoraire" class="info-item">
                  <span class="info-label">Tarif horaire</span>
                  <span class="info-val">{{ user.tarifHoraire }} €/h</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Membre depuis</span>
                  <span class="info-val">{{ new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Reviews -->
          <div v-if="activeTab === 'reviews'">
            <div v-if="!reviews.length" class="no-reviews">
              <span>🌟</span>
              <p>Aucun avis pour le moment.</p>
            </div>
            <div v-else class="reviews-list">
              <div v-for="(r, i) in reviews" :key="i" class="review-card">
                <div class="review-header">
                  <div class="review-avatar">
                    {{ ((r.requesterPrenom as string)?.[0] ?? '?').toUpperCase() }}
                  </div>
                  <div>
                    <div class="review-author">{{ r.requesterPrenom as string || 'Client' }}</div>
                    <div class="review-date">{{ new Date(r.ratingGivenAt as string).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}</div>
                  </div>
                  <div class="review-stars">
                    <span class="stars-full">{{ '★'.repeat(starsArr(reviewAvg(r)).full) }}</span>
                    <span class="stars-empty">{{ '★'.repeat(starsArr(reviewAvg(r)).empty) }}</span>
                    <span class="review-score">{{ reviewAvg(r).toFixed(1) }}</span>
                  </div>
                </div>
                <p v-if="r.ratingComment" class="review-text">{{ r.ratingComment as string }}</p>
              </div>
              <button
                v-if="reviews.length < totalReviews"
                class="load-more-btn"
                :disabled="loadingReviews"
                @click="loadMoreReviews"
              >
                {{ loadingReviews ? 'Chargement...' : `Voir plus d'avis (${totalReviews - reviews.length} restants)` }}
              </button>
            </div>
          </div>
        </div>

        <!-- Right: booking widget -->
        <aside class="booking-widget">
          <!-- Success -->
          <div v-if="formSent" class="booking-success">
            <div class="success-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3a5020" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h3>Demande envoyée !</h3>
            <p>Vérifiez votre boîte email pour confirmer votre demande. {{ user.prenom }} vous répondra rapidement.</p>
          </div>

          <template v-else>
            <div class="widget-header">
              <div>
                <span class="widget-title">Réserver avec {{ user.prenom }}</span>
                <span v-if="user.tarifHoraire" class="widget-price">{{ user.tarifHoraire }} €/h</span>
              </div>
              <div v-if="user.numberOfReviews > 0" class="widget-rating">
                <span class="stars-full" style="font-size:0.85rem">{{ '★'.repeat(starsArr(user.averageRating).full) }}</span>
                <span style="font-size:0.8rem;font-weight:600">{{ user.averageRating.toFixed(1) }}</span>
              </div>
            </div>

            <!-- Calendar -->
            <div class="calendar">
              <div class="cal-nav">
                <button class="cal-nav-btn" :disabled="!canGoPrev" @click="prevMonth">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <span class="cal-month">{{ calMonthLabel }}</span>
                <button class="cal-nav-btn" @click="nextMonth">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>

              <div class="cal-grid">
                <div v-for="d in DAYS_FR" :key="d" class="cal-day-label">{{ d }}</div>
                <template v-for="(d, i) in calDays" :key="i">
                  <div v-if="!d" class="cal-empty"></div>
                  <button
                    v-else
                    :class="[
                      'cal-day',
                      { past: d.past, selected: d.selected, today: d.isToday }
                    ]"
                    :disabled="d.past"
                    @click="selectDay(d)"
                  >{{ d.day }}</button>
                </template>
              </div>
            </div>

            <!-- Selected date display -->
            <div v-if="selectedDateLabel" class="selected-date">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {{ selectedDateLabel }}
            </div>
            <div v-else class="date-hint">Sélectionnez une date ci-dessus</div>

            <!-- Booking form -->
            <div class="booking-form">
              <div class="field">
                <label>Email *</label>
                <input v-model="form.requesterEmail" type="email" placeholder="votre@email.fr" />
              </div>

              <div class="field-row">
                <div class="field">
                  <label>Prénom</label>
                  <input v-model="form.requesterPrenom" type="text" />
                </div>
                <div class="field">
                  <label>Nom</label>
                  <input v-model="form.requesterNom" type="text" />
                </div>
              </div>

              <div class="field">
                <label>Service(s) souhaité(s)</label>
                <div class="service-chips">
                  <button
                    v-for="s in user.prestations" :key="s"
                    type="button"
                    :class="['service-chip', { active: form.prestations.includes(s) }]"
                    @click="toggleService(s)"
                  >{{ categoryName(s) }}</button>
                </div>
              </div>

              <div class="field">
                <label>Description du besoin</label>
                <textarea v-model="form.description" rows="3" placeholder="Superficie, accès, précisions..."></textarea>
              </div>

              <p v-if="formError" class="form-error">{{ formError }}</p>

              <button class="btn-book" :disabled="sending" @click="submitRequest">
                <svg v-if="!sending" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span class="spinner-sm" v-else></span>
                {{ sending ? 'Envoi...' : 'Envoyer la demande' }}
              </button>

              <p class="no-charge-notice">Aucun paiement maintenant · Confirmation par email</p>
            </div>
          </template>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

/* ── LOADING ── */
.loading-state {
  display: flex; align-items: center; justify-content: center;
  min-height: 60vh;
}
.spinner {
  width: 36px; height: 36px;
  border: 3px solid #e5e7eb;
  border-top-color: #3a5020;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── PAGE ── */
.profile-page { background: #f2efe6; }

/* ── HERO ── */
.hero-cover {
  height: 260px;
  background: linear-gradient(155deg, #141f0b 0%, #253515 55%, #3a5020 100%);
  background-size: cover;
  background-position: center;
  position: relative;
}
.hero-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.55) 100%);
}

/* ── CONTAINER ── */
.container { max-width: 1100px; margin: 0 auto; padding: 0 2rem 4rem; }

/* ── HEADER ── */
.profile-header {
  display: flex;
  align-items: flex-end;
  gap: 1.5rem;
  margin-top: -60px;
  margin-bottom: 2.5rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e9e5d6;
  position: relative;
  z-index: 1;
}

.profile-avatar {
  width: 120px; height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid #fff;
  box-shadow: 0 6px 20px rgba(0,0,0,0.18);
  flex-shrink: 0;
  background: linear-gradient(135deg, #dde6c8, #a8c47a);
}
.profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 2.5rem; font-weight: 900; color: #3a5020;
}

.profile-meta { flex: 1; }
.profile-name-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.3rem; }
h1 { font-size: 1.75rem; font-weight: 900; color: #111827; margin: 0; letter-spacing: -0.02em; }
.badge-verified {
  display: inline-flex; align-items: center; gap: 0.3rem;
  font-size: 0.72rem; font-weight: 600; color: #3a5020;
  background: rgba(81,95,55,0.08); border: 1px solid rgba(81,95,55,0.2);
  padding: 0.2rem 0.6rem; border-radius: 999px;
}
.profile-ville {
  display: flex; align-items: center; gap: 0.3rem;
  color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem;
}
.profile-rating {
  display: flex; align-items: center; gap: 0.25rem;
  font-size: 0.9rem; margin-bottom: 0.6rem;
}
.stars-full { color: #e6c553; }
.stars-empty { color: #e0dbd0; }
.rating-score { font-weight: 700; color: #111827; margin-left: 0.15rem; }
.rating-count { color: #9ca3af; font-size: 0.8rem; }
.profile-tags { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.tag {
  background: #f0ede3; color: #515F37;
  border: 1px solid #e0d8c2;
  padding: 0.2rem 0.65rem; border-radius: 999px;
  font-size: 0.78rem; font-weight: 600;
}

.tarif-badge {
  display: flex; flex-direction: column; align-items: center;
  background: #3a5020; color: #fff;
  padding: 0.875rem 1.375rem; border-radius: 16px;
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(58,80,32,0.3);
}
.tarif-val { font-size: 1.6rem; font-weight: 900; line-height: 1; color: #a8c47a; }
.tarif-unit { font-size: 0.72rem; color: rgba(255,255,255,0.6); margin-top: 0.25rem; }

/* ── BODY ── */
.profile-body {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 3rem;
  align-items: start;
}

/* ── TABS ── */
.tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #e9e5d6;
  margin-bottom: 2rem;
}
.tab {
  padding: 0.65rem 1.25rem;
  background: none; border: none;
  font-size: 0.9rem; font-weight: 600;
  color: #9ca3af; cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.15s, border-color 0.15s;
  display: flex; align-items: center; gap: 0.4rem;
  font-family: inherit;
}
.tab:hover { color: #515F37; }
.tab.active { color: #3a5020; border-bottom-color: #3a5020; }
.tab-count {
  background: #f0ede3; color: #9ca3af;
  font-size: 0.7rem; padding: 0.1rem 0.45rem;
  border-radius: 999px; font-weight: 700;
}
.tab.active .tab-count { background: rgba(81,95,55,0.1); color: #3a5020; }

/* ── CONTENT SECTIONS ── */
.content-section { margin-bottom: 2.5rem; }
.content-section h2 {
  font-size: 0.72rem; font-weight: 700;
  color: #515F37; margin: 0 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e9e5d6;
  text-transform: uppercase; letter-spacing: 0.1em;
}
.description-text {
  color: #374151; font-size: 0.95rem;
  line-height: 1.75; white-space: pre-wrap;
}
.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.5rem;
}
.service-item {
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0.55rem 0.875rem;
  background: #FCFAF5; border: 1.5px solid #e9e5d6; border-radius: 10px;
  font-size: 0.875rem; color: #374151;
  transition: border-color 0.15s;
}
.service-item:hover { border-color: #a8c47a; }
.service-icon {
  width: 28px; height: 28px;
  background: rgba(81,95,55,0.08); color: #3a5020;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.info-grid { display: flex; flex-direction: column; gap: 0; }
.info-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.65rem 0;
  border-bottom: 1px solid #e9e5d6;
}
.info-label { font-size: 0.875rem; color: #9ca3af; }
.info-val { font-size: 0.875rem; font-weight: 600; color: #1a1a0e; }

/* ── REVIEWS ── */
.no-reviews { text-align: center; padding: 3rem 2rem; color: #9ca3af; }
.no-reviews span { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }
.reviews-list { display: flex; flex-direction: column; gap: 1rem; }
.review-card {
  padding: 1.125rem 1.25rem;
  background: #FCFAF5;
  border: 1.5px solid #e9e5d6;
  border-radius: 14px;
  transition: border-color 0.15s;
}
.review-card:hover { border-color: #c8d9a6; }
.review-header {
  display: flex; align-items: center; gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.review-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #dde6c8, #a8c47a);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem; font-weight: 800; color: #3a5020;
  flex-shrink: 0;
}
.review-author { font-size: 0.875rem; font-weight: 700; color: #1a1a0e; }
.review-date { font-size: 0.72rem; color: #9ca3af; }
.review-stars {
  margin-left: auto;
  display: flex; align-items: center; gap: 0.2rem;
}
.review-score { font-size: 0.8rem; font-weight: 700; color: #1a1a0e; }
.review-text { font-size: 0.875rem; color: #374151; line-height: 1.65; }
.load-more-btn {
  width: 100%; padding: 0.75rem;
  background: none; border: 1.5px solid #e9e5d6;
  border-radius: 10px; color: #515F37;
  font-size: 0.875rem; font-weight: 600;
  cursor: pointer; transition: all 0.15s; font-family: inherit;
  margin-top: 0.5rem;
}
.load-more-btn:hover { border-color: #3a5020; background: rgba(81,95,55,0.04); }
.load-more-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── BOOKING WIDGET ── */
.booking-widget {
  position: sticky;
  top: 84px;
  background: #FCFAF5;
  border: 1.5px solid #e9e5d6;
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0,0,0,0.07);
}

.booking-success {
  text-align: center; padding: 2rem 0;
}
.success-icon {
  width: 64px; height: 64px;
  background: rgba(81,95,55,0.08);
  border: 2px solid rgba(81,95,55,0.15);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1rem;
}
.booking-success h3 { font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem; color: #1a1a0e; }
.booking-success p { color: #6b7280; font-size: 0.875rem; line-height: 1.6; }

.widget-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e9e5d6;
}
.widget-title { display: block; font-size: 1rem; font-weight: 800; color: #1a1a0e; }
.widget-price { display: block; font-size: 0.875rem; color: #9ca3af; margin-top: 0.15rem; }
.widget-rating { display: flex; align-items: center; gap: 0.25rem; }

/* Calendar */
.calendar { margin-bottom: 1rem; }
.cal-nav {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 0.75rem;
}
.cal-month { font-size: 0.875rem; font-weight: 700; color: #1a1a0e; text-transform: capitalize; }
.cal-nav-btn {
  width: 28px; height: 28px;
  background: none; border: 1.5px solid #e9e5d6;
  border-radius: 7px; cursor: pointer; color: #515F37;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.cal-nav-btn:hover:not(:disabled) { border-color: #3a5020; background: #f0ede3; }
.cal-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.cal-day-label {
  text-align: center;
  font-size: 0.6rem; font-weight: 700; color: #b5ae94;
  padding: 0.2rem 0; text-transform: uppercase;
}
.cal-empty { height: 32px; }
.cal-day {
  height: 32px;
  background: none; border: none; border-radius: 7px;
  font-size: 0.8rem; font-weight: 500;
  color: #374151; cursor: pointer;
  transition: background 0.15s, color 0.15s;
  display: flex; align-items: center; justify-content: center;
  font-family: inherit;
}
.cal-day:hover:not(:disabled):not(.selected) { background: #f0ede3; color: #3a5020; }
.cal-day.today { font-weight: 800; color: #3a5020; }
.cal-day.selected { background: #3a5020; color: #fff; font-weight: 700; }
.cal-day.past { color: #d6d0c4; cursor: not-allowed; }

/* Selected date & hint */
.selected-date {
  display: flex; align-items: center; gap: 0.4rem;
  background: #f0ede3; color: #3a5020;
  border: 1px solid #c8d9a6;
  border-radius: 9px;
  padding: 0.5rem 0.875rem;
  font-size: 0.8rem; font-weight: 600;
  margin-bottom: 1rem; text-transform: capitalize;
}
.date-hint {
  font-size: 0.78rem; color: #b5ae94;
  text-align: center; margin-bottom: 1rem;
  padding: 0.4rem;
}

/* Booking form */
.booking-form { display: flex; flex-direction: column; gap: 0; }
.field { margin-bottom: 0.75rem; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.75rem; }
label { display: block; font-size: 0.7rem; font-weight: 700; color: #6b6347; margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.05em; }
input, textarea {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1.5px solid #e9e5d6;
  border-radius: 9px;
  font-size: 0.875rem; color: #1a1a0e;
  background: #f5f2eb;
  outline: none;
  transition: border-color 0.15s, background 0.15s;
  font-family: inherit;
}
input:focus, textarea:focus { border-color: #3a5020; background: #FCFAF5; box-shadow: 0 0 0 3px rgba(58,80,32,0.08); }
textarea { resize: vertical; }

.service-chips { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.service-chip {
  padding: 0.25rem 0.65rem;
  border: 1.5px solid #e9e5d6; border-radius: 999px;
  background: #f5f2eb; color: #515F37;
  font-size: 0.75rem; font-weight: 500;
  cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.service-chip:hover { border-color: #3a5020; color: #3a5020; }
.service-chip.active { background: #3a5020; border-color: #3a5020; color: #fff; }

.form-error { color: #dc2626; font-size: 0.78rem; margin-bottom: 0.5rem; }

.btn-book {
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  width: 100%; padding: 0.9rem;
  background: #3a5020; color: #fff;
  border: none; border-radius: 12px;
  font-size: 0.95rem; font-weight: 700;
  cursor: pointer; transition: background 0.15s; font-family: inherit;
  margin-top: 0.25rem;
}
.btn-book:hover:not(:disabled) { background: #2a3c16; }
.btn-book:disabled { opacity: 0.6; cursor: not-allowed; }

.spinner-sm {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}

.no-charge-notice {
  text-align: center; font-size: 0.72rem;
  color: #b5ae94; margin-top: 0.6rem;
}

/* ── RESPONSIVE ── */
@media (max-width: 900px) {
  .profile-body { grid-template-columns: 1fr; }
  .booking-widget { position: static; }
  .profile-header { flex-wrap: wrap; }
  .tarif-badge { order: -1; }
}
@media (max-width: 600px) {
  h1 { font-size: 1.4rem; }
  .profile-header { margin-top: -40px; gap: 1rem; }
  .profile-avatar { width: 90px; height: 90px; }
  .field-row { grid-template-columns: 1fr; }
  .container { padding: 0 1rem 4rem; }
}
</style>
