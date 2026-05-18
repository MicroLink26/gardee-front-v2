<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import { listMyRequests, listMyClientRequests, providerAccept, providerRefuse, providerCancel } from '../../../services/requests';
import type { ServiceRequest } from '../../../types';
import { REQUEST_STATUS_LABELS } from '../../../types';

const auth = useAuthStore();
const requests = ref<ServiceRequest[]>([]);
const total = ref(0);
const loading = ref(true);
const error = ref('');

const isPrestataire = computed(() => auth.isPrestataire || auth.isStaff);

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

function statusClass(status: string) {
  if (['completed', 'scheduled'].includes(status)) return 'badge-green';
  if (['refused', 'cancelled'].includes(status)) return 'badge-red';
  return 'badge-yellow';
}

onMounted(load);
</script>

<template>
  <div>
    <h2>{{ isPrestataire ? 'Mes demandes reçues' : 'Mes réservations' }}</h2>
    <div v-if="loading" class="loading">Chargement...</div>
    <p v-else-if="error" class="error">{{ error }}</p>
    <p v-else-if="!requests.length" class="empty">Aucune demande pour le moment.</p>

    <div v-else class="request-list">
      <div v-for="req in requests" :key="req._id" class="request-card">
        <div class="request-header">
          <div>
            <p class="request-email">{{ req.requesterEmail }}</p>
            <p class="request-prestations">{{ req.prestations.join(', ') }}</p>
          </div>
          <span class="badge" :class="statusClass(req.status)">{{ REQUEST_STATUS_LABELS[req.status] }}</span>
        </div>

        <div class="request-meta">
          <span v-if="req.desiredAt">📅 {{ new Date(req.desiredAt).toLocaleDateString('fr-FR') }}</span>
          <span v-if="req.ville">📍 {{ req.ville }}</span>
          <span v-if="req.estimatedHours">⏱ {{ req.estimatedHours }}h</span>
        </div>

        <p v-if="req.description" class="request-desc">{{ req.description }}</p>

        <div v-if="isPrestataire && req.status === 'sent_to_provider'" class="request-actions">
          <button class="btn-success" @click="accept(req._id)">Accepter</button>
          <button class="btn-danger" @click="refuse(req._id)">Refuser</button>
        </div>
        <div v-if="isPrestataire && req.status === 'scheduled'" class="request-actions">
          <button class="btn-danger" @click="cancel(req._id)">Annuler</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
h2 { margin-bottom: 1.5rem; }
.loading, .empty { color: #6b7280; }
.error { color: #ef4444; }
.request-list { display: flex; flex-direction: column; gap: 1rem; }
.request-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem; }
.request-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
.request-email { font-weight: 600; margin: 0; }
.request-prestations { color: #6b7280; font-size: 0.875rem; margin: 0.25rem 0 0; }
.badge { padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
.badge-green { background: #dcfce7; color: #16a34a; }
.badge-yellow { background: #fef9c3; color: #ca8a04; }
.badge-red { background: #fee2e2; color: #dc2626; }
.request-meta { display: flex; gap: 1rem; font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem; flex-wrap: wrap; }
.request-desc { font-size: 0.9rem; color: #374151; margin: 0.5rem 0; }
.request-actions { display: flex; gap: 0.75rem; margin-top: 1rem; }
.btn-success { padding: 0.45rem 1.25rem; background: #16a34a; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
.btn-danger { padding: 0.45rem 1.25rem; background: #fff; color: #dc2626; border: 1.5px solid #dc2626; border-radius: 8px; cursor: pointer; font-weight: 600; }
.btn-success:hover { background: #15803d; }
.btn-danger:hover { background: #fee2e2; }
</style>
