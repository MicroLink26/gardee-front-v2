<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { createRequest } from '../../services/requests';
import { useCategoriesStore } from '../../stores/categories';

const props = defineProps<{
  prestataireId: string;
  prenom: string;
  tarifHoraire?: number;
  averageRating?: number;
  numberOfReviews?: number;
  prestations: string[];
}>();

const categoriesStore = useCategoriesStore();

const formSent = ref(false);
const formError = ref('');
const sending = ref(false);

const form = ref({
  requesterEmail: '',
  requesterPrenom: '',
  requesterNom: '',
  prestations: [] as string[],
  description: '',
  desiredAt: '',
});

const today = new Date();
today.setHours(0, 0, 0, 0);
const calYear = ref(today.getFullYear());
const calMonth = ref(today.getMonth());

const calMonthLabel = computed(() =>
  new Date(calYear.value, calMonth.value).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
);

const calDays = computed(() => {
  const firstDay = (new Date(calYear.value, calMonth.value, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(calYear.value, calMonth.value + 1, 0).getDate();
  const days: ({ day: number; date: Date; past: boolean; selected: boolean; isToday: boolean } | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(calYear.value, calMonth.value, d);
    const iso = date.toISOString().split('T')[0];
    days.push({ day: d, date, past: date < today, selected: form.value.desiredAt === iso, isToday: date.getTime() === today.getTime() });
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

function selectDay(d: { date: Date; past: boolean } | null) {
  if (!d || d.past) return;
  form.value.desiredAt = d.date.toISOString().split('T')[0];
}

const selectedDateLabel = computed(() => {
  if (!form.value.desiredAt) return null;
  return new Date(form.value.desiredAt + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
});

const categoryName = computed(() => {
  const map = new Map(categoriesStore.categories.map(c => [c._id, c.name]));
  return (id: string) => map.get(id) ?? id;
});

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

function starsArr(n: number) {
  const full = Math.round(n ?? 0);
  return { full, empty: 5 - full };
}

const DAYS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

onMounted(() => categoriesStore.load());
</script>

<template>
  <div class="booking-widget">
    <div v-if="formSent" class="booking-success">
      <div class="success-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3a5020" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      </div>
      <h3>Demande envoyée !</h3>
      <p>Vérifiez votre boîte email pour confirmer votre demande. {{ prenom }} vous répondra rapidement.</p>
    </div>

    <template v-else>
      <div class="widget-header">
        <div>
          <span class="widget-title">Réserver avec {{ prenom }}</span>
          <span v-if="tarifHoraire" class="widget-price">{{ tarifHoraire }} €/h</span>
        </div>
        <div v-if="numberOfReviews && numberOfReviews > 0" class="widget-rating">
          <span class="stars-full" style="font-size:0.85rem">{{ '★'.repeat(starsArr(averageRating ?? 0).full) }}</span>
          <span style="font-size:0.8rem;font-weight:600">{{ (averageRating ?? 0).toFixed(1) }}</span>
        </div>
      </div>

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
            <button v-else :class="['cal-day', { past: d.past, selected: d.selected, today: d.isToday }]" :disabled="d.past" @click="selectDay(d)">{{ d.day }}</button>
          </template>
        </div>
      </div>

      <div v-if="selectedDateLabel" class="selected-date">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        {{ selectedDateLabel }}
      </div>
      <div v-else class="date-hint">Sélectionnez une date ci-dessus</div>

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
          <label>Service(s)</label>
          <div class="service-chips">
            <button v-for="s in prestations" :key="s" type="button" :class="['service-chip', { active: form.prestations.includes(s) }]" @click="toggleService(s)">
              {{ categoryName(s) }}
            </button>
          </div>
        </div>
        <div class="field">
          <label>Description</label>
          <textarea v-model="form.description" rows="3" placeholder="Superficie, accès, précisions..."></textarea>
        </div>

        <p v-if="formError" class="form-error">{{ formError }}</p>

        <button class="btn-book" :disabled="sending" @click="submitRequest">
          <svg v-if="!sending" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span v-else class="spinner-sm"></span>
          {{ sending ? 'Envoi…' : 'Envoyer la demande' }}
        </button>
        <p class="no-charge-notice">Aucun paiement maintenant · Confirmation par email</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.booking-widget {
  background: #FCFAF5;
  border: 1.5px solid #e9e5d6;
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0,0,0,0.07);
}

.booking-success { text-align: center; padding: 2rem 0; }
.success-icon {
  width: 64px; height: 64px;
  background: rgba(81,95,55,0.08); border: 2px solid rgba(81,95,55,0.15);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1rem;
}
.booking-success h3 { font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem; color: #1a1a0e; }
.booking-success p { color: #6b7280; font-size: 0.875rem; line-height: 1.6; }

.widget-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 1.25rem; padding-bottom: 1rem;
  border-bottom: 1px solid #e9e5d6;
}
.widget-title { display: block; font-size: 1rem; font-weight: 800; color: #1a1a0e; }
.widget-price { display: block; font-size: 0.875rem; color: #9ca3af; margin-top: 0.15rem; }
.widget-rating { display: flex; align-items: center; gap: 0.25rem; }
.stars-full { color: #e6c553; }

.calendar { margin-bottom: 1rem; }
.cal-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
.cal-month { font-size: 0.875rem; font-weight: 700; color: #1a1a0e; text-transform: capitalize; }
.cal-nav-btn {
  width: 28px; height: 28px;
  background: none; border: 1.5px solid #e9e5d6; border-radius: 7px;
  cursor: pointer; color: #515F37;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.cal-nav-btn:hover:not(:disabled) { border-color: #3a5020; background: #f0ede3; }
.cal-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.cal-day-label { text-align: center; font-size: 0.6rem; font-weight: 700; color: #b5ae94; padding: 0.2rem 0; text-transform: uppercase; }
.cal-empty { height: 32px; }
.cal-day {
  height: 32px; background: none; border: none; border-radius: 7px;
  font-size: 0.8rem; font-weight: 500; color: #374151; cursor: pointer;
  transition: background 0.15s, color 0.15s;
  display: flex; align-items: center; justify-content: center;
  font-family: inherit;
}
.cal-day:hover:not(:disabled):not(.selected) { background: #f0ede3; color: #3a5020; }
.cal-day.today { font-weight: 800; color: #3a5020; }
.cal-day.selected { background: #3a5020; color: #fff; font-weight: 700; }
.cal-day.past { color: #d6d0c4; cursor: not-allowed; }

.selected-date {
  display: flex; align-items: center; gap: 0.4rem;
  background: #f0ede3; color: #3a5020;
  border: 1px solid #c8d9a6; border-radius: 9px;
  padding: 0.5rem 0.875rem;
  font-size: 0.8rem; font-weight: 600;
  margin-bottom: 1rem; text-transform: capitalize;
}
.date-hint { font-size: 0.78rem; color: #b5ae94; text-align: center; margin-bottom: 1rem; padding: 0.4rem; }

.booking-form { display: flex; flex-direction: column; gap: 0; }
.field { margin-bottom: 0.75rem; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.75rem; }
label { display: block; font-size: 0.7rem; font-weight: 700; color: #6b6347; margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.05em; }
input, textarea {
  width: 100%; padding: 0.55rem 0.75rem;
  border: 1.5px solid #e9e5d6; border-radius: 9px;
  font-size: 0.875rem; color: #1a1a0e; background: #f5f2eb;
  outline: none; transition: border-color 0.15s, background 0.15s;
  font-family: inherit;
}
input:focus, textarea:focus { border-color: #3a5020; background: #FCFAF5; box-shadow: 0 0 0 3px rgba(58,80,32,0.08); }
textarea { resize: vertical; }

.service-chips { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.service-chip {
  padding: 0.25rem 0.65rem; border: 1.5px solid #e9e5d6; border-radius: 999px;
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
  border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
  border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

.no-charge-notice { text-align: center; font-size: 0.72rem; color: #b5ae94; margin-top: 0.6rem; }
</style>
