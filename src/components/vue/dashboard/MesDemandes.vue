<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import { listMyRequests, listMyClientRequests, providerAccept, providerRefuse, providerCancel } from '../../../services/requests';
import { useCategoryName } from '../../../composables/useCategoryName';
import type { ServiceRequest } from '../../../types';
import { REQUEST_STATUS_LABELS } from '../../../types';

const { categoryName, categoriesStore } = useCategoryName();

const auth = useAuthStore();
const requests = ref<ServiceRequest[]>([]);
const total = ref(0);
const loading = ref(true);
const error = ref('');
const filterStatus = ref('all');

const isPrestataire = computed(() => auth.isPrestataire || auth.isStaff);

const STATUS_FILTERS = [
  { val: 'all', label: 'Toutes' },
  { val: 'active', label: 'En cours' },
  { val: 'completed', label: 'Terminées' },
  { val: 'cancelled', label: 'Annulées' },
];

const filtered = computed(() => {
  if (filterStatus.value === 'all') return requests.value;
  if (filterStatus.value === 'active') return requests.value.filter(r => ['sent_to_provider', 'client_accepted', 'scheduled', 'provider_proposed'].includes(r.status));
  if (filterStatus.value === 'completed') return requests.value.filter(r => r.status === 'completed');
  if (filterStatus.value === 'cancelled') return requests.value.filter(r => ['refused', 'cancelled'].includes(r.status));
  return requests.value;
});

async function load() {
  loading.value = true;
  try {
    const data = isPrestataire.value ? await listMyRequests() : await listMyClientRequests();
    requests.value = data.items;
    total.value = data.total;
  } catch {
    error.value = 'Impossible de charger les demandes.';
  } finally {
    loading.value = false;
  }
}

async function accept(id: string) {
  await providerAccept(id);
  load();
}
async function refuse(id: string) {
  const msg = prompt('Message (facultatif) :');
  await providerRefuse(id, msg ?? undefined);
  load();
}
async function cancel(id: string) {
  if (!confirm('Annuler cette prestation ?')) return;
  await providerCancel(id);
  load();
}

function statusBadgeClass(status: string) {
  if (['completed', 'scheduled'].includes(status)) return 'badge-green';
  if (['refused', 'cancelled'].includes(status)) return 'badge-red';
  if (status === 'sent_to_provider') return 'badge-orange';
  return 'badge-blue';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

onMounted(() => {
  categoriesStore.load();
  load();
});
</script>

<template>
  <div class="demandes">
    <div class="page-header">
      <div>
        <h1>{{ isPrestataire ? 'Mes demandes reçues' : 'Mes réservations' }}</h1>
        <p class="header-sub">{{ total }} demande{{ total > 1 ? 's' : '' }} au total</p>
      </div>
    </div>

    <div class="filter-tabs">
      <button
        v-for="f in STATUS_FILTERS" :key="f.val"
        :class="['filter-tab', { active: filterStatus === f.val }]"
        @click="filterStatus = f.val"
      >{{ f.label }}</button>
    </div>

    <div v-if="loading" class="skeleton-list">
      <div v-for="i in 4" :key="i" class="skeleton-card">
        <div class="skeleton" style="height:100px;border-radius:14px"></div>
      </div>
    </div>

    <p v-else-if="error" class="error-msg">{{ error }}</p>

    <div v-else-if="!filtered.length" class="empty">
      <img src="/arbreUtiliser.svg" alt="" style="height:100px;opacity:0.5;margin-bottom:1rem" />
      <p>Aucune demande dans cette catégorie.</p>
    </div>

    <div v-else class="request-list">
      <div v-for="req in filtered" :key="req._id" class="request-card">
        <div class="request-top">
          <div class="request-who">
            <div class="who-avatar">{{ req.requesterPrenom?.[0] ?? req.requesterEmail[0].toUpperCase() }}</div>
            <div>
              <div class="who-name">
                {{ req.requesterPrenom ? `${req.requesterPrenom} ${req.requesterNom ?? ''}` : req.requesterEmail }}
              </div>
              <div class="who-email">{{ req.requesterEmail }}</div>
            </div>
          </div>
          <span :class="['status-badge', statusBadgeClass(req.status)]">
            {{ REQUEST_STATUS_LABELS[req.status] }}
          </span>
        </div>

        <div class="request-services">
          <span v-for="p in req.prestations" :key="p" class="service-tag">{{ categoryName(p) }}</span>
        </div>

        <div class="request-meta">
          <span v-if="req.desiredAt" class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {{ formatDate(req.desiredAt) }}
          </span>
          <span v-if="req.ville" class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg>
            {{ req.ville }}
          </span>
          <span v-if="req.estimatedHours" class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {{ req.estimatedHours }}h estimées
          </span>
        </div>

        <p v-if="req.description" class="request-desc">{{ req.description }}</p>

        <div v-if="isPrestataire && req.status === 'sent_to_provider'" class="request-actions">
          <button class="btn-accept" @click="accept(req._id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Accepter
          </button>
          <button class="btn-refuse" @click="refuse(req._id)">Refuser</button>
        </div>
        <div v-if="isPrestataire && req.status === 'scheduled'" class="request-actions">
          <button class="btn-refuse" @click="cancel(req._id)">Annuler la prestation</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.demandes { display: flex; flex-direction: column; gap: 1.5rem; }

.page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.page-header h1 { font-size: 1.5rem; font-weight: 900; color: #1a1a0e; margin: 0 0 0.2rem; }
.header-sub { font-size: 0.875rem; color: #9ca3af; margin: 0; }

/* Filters */
.filter-tabs { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.filter-tab {
  padding: 0.4rem 1rem;
  border: 1.5px solid #e5e2d3;
  border-radius: 999px;
  background: #fff;
  color: #6b7280;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.filter-tab:hover { border-color: #515F37; color: #515F37; }
.filter-tab.active { background: #515F37; border-color: #515F37; color: #fff; }

/* Empty */
.empty { text-align: center; padding: 3rem 1rem; color: #9ca3af; }
.error-msg { color: #ef4444; font-size: 0.875rem; }

/* List */
.request-list { display: flex; flex-direction: column; gap: 0.875rem; }

.request-card {
  background: #fff;
  border: 1.5px solid #e5e2d3;
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.request-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }

.request-who { display: flex; align-items: center; gap: 0.75rem; }

.who-avatar {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: #f0ede3;
  color: #515F37;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 0.9rem;
  flex-shrink: 0;
}

.who-name { font-weight: 700; font-size: 0.9rem; color: #1a1a0e; }
.who-email { font-size: 0.75rem; color: #9ca3af; margin-top: 0.1rem; }

.status-badge {
  padding: 0.25rem 0.8rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}
.badge-green { background: #f0ede3; color: #515F37; }
.badge-red { background: #fee2e2; color: #dc2626; }
.badge-orange { background: #fff7ed; color: #ea580c; }
.badge-blue { background: #eff6ff; color: #3b82f6; }

.request-services { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.service-tag {
  background: #f0ede3;
  color: #515F37;
  border: 1px solid #d6cda4;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.request-meta { display: flex; gap: 1rem; flex-wrap: wrap; }
.meta-item {
  display: flex; align-items: center; gap: 0.35rem;
  font-size: 0.8rem; color: #6b7280;
}
.meta-item svg { width: 13px; height: 13px; flex-shrink: 0; }

.request-desc {
  font-size: 0.875rem;
  color: #374151;
  margin: 0;
  padding: 0.75rem;
  background: #faf8f2;
  border-radius: 8px;
  border-left: 3px solid #d6cda4;
}

.request-actions { display: flex; gap: 0.75rem; }

.btn-accept {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.5rem 1.25rem;
  background: #515F37; color: #fff;
  border: none; border-radius: 8px;
  font-weight: 700; font-size: 0.875rem;
  cursor: pointer; transition: background 0.15s;
}
.btn-accept svg { width: 15px; height: 15px; }
.btn-accept:hover { background: #3d4a28; }

.btn-refuse {
  padding: 0.5rem 1.25rem;
  background: #fff; color: #dc2626;
  border: 1.5px solid #fca5a5;
  border-radius: 8px;
  font-weight: 600; font-size: 0.875rem;
  cursor: pointer; transition: all 0.15s;
}
.btn-refuse:hover { background: #fee2e2; }

/* Skeleton */
.skeleton-list { display: flex; flex-direction: column; gap: 0.875rem; }
.skeleton-card { border-radius: 16px; overflow: hidden; }
.skeleton {
  background: linear-gradient(90deg, #f3f0e8 25%, #ebe8de 50%, #f3f0e8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

@media (max-width: 600px) {
  .request-top { flex-direction: column; gap: 0.5rem; }
  .request-actions { flex-direction: column; }
  .btn-accept, .btn-refuse { width: 100%; justify-content: center; }
}
</style>
