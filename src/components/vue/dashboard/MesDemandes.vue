<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import { listMyRequests, listMyClientRequests, providerAccept, providerRefuse, providerCancel, providerPropose, markComplete, sendMessage, clientSendMessage } from '../../../services/requests';
import { useCategoryName } from '../../../composables/useCategoryName';
import type { ServiceRequest } from '../../../types';
import { REQUEST_STATUS_LABELS } from '../../../types';

const { categoryName, categoriesStore } = useCategoryName();

type RequestWithPerspective = ServiceRequest & { _perspective: 'provider' | 'client' };

const auth = useAuthStore();
const requests = ref<RequestWithPerspective[]>([]);
const total = ref(0);
const loading = ref(true);
const error = ref('');
const filterStatus = ref('all');

const isPrestataire = computed(() => auth.user?.isPrestataire === true);

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
    if (isPrestataire.value) {
      const [asProvider, asClient] = await Promise.all([listMyRequests(), listMyClientRequests()]);
      const seen = new Set<string>();
      const merged: RequestWithPerspective[] = [
        ...asProvider.items.map(r => ({ ...r, _perspective: 'provider' as const })),
        ...asClient.items.map(r => ({ ...r, _perspective: 'client' as const })),
      ].filter(r => { if (seen.has(r._id)) return false; seen.add(r._id); return true; });
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      requests.value = merged;
      total.value = merged.length;
    } else {
      const data = await listMyClientRequests();
      requests.value = data.items.map(r => ({ ...r, _perspective: 'client' as const }));
      total.value = data.total;
    }
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

async function complete(id: string) {
  if (!confirm('Marquer cette prestation comme terminée ? Un email sera envoyé au client pour l\'évaluer.')) return;
  await markComplete(id);
  load();
}

const proposingId = ref<string | null>(null);
const proposeDate = ref('');
const proposeComment = ref('');

function openPropose(id: string) {
  proposingId.value = id;
  proposeDate.value = '';
  proposeComment.value = '';
}

async function propose(id: string) {
  if (!proposeDate.value) return;
  await providerPropose(id, new Date(proposeDate.value).toISOString(), proposeComment.value || undefined);
  proposingId.value = null;
  load();
}

const messagingId = ref<string | null>(null);
const messageContent = ref('');
const messageSent = ref<string | null>(null);

function openMessage(id: string) {
  messagingId.value = id;
  messageContent.value = '';
  messageSent.value = null;
}

async function submitMessage(id: string) {
  if (!messageContent.value.trim()) return;
  const content = messageContent.value.trim();
  const req = requests.value.find(r => r._id === id);
  if (req?._perspective === 'provider') {
    await sendMessage(id, content);
  } else {
    await clientSendMessage(id, content);
  }
  messageContent.value = '';
  messageSent.value = id;
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

onMounted(async () => {
  categoriesStore.load();
  await auth.fetchMe();
  load();
});
</script>

<template>
  <div class="demandes">
    <div class="page-header">
      <div>
        <p class="header-eyebrow">{{ isPrestataire ? 'Espace prestataire' : 'Mon espace' }}</p>
        <h1>{{ isPrestataire ? 'Mes demandes' : 'Mes réservations' }}</h1>
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
      <img src="/img/arbreUtiliser.svg" alt="" style="height:100px;opacity:0.5;margin-bottom:1rem" />
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
          <div class="badges">
            <span v-if="isPrestataire" :class="['perspective-badge', req._perspective === 'provider' ? 'badge-provider' : 'badge-requester']">
              {{ req._perspective === 'provider' ? 'Reçue' : 'Envoyée' }}
            </span>
            <span :class="['status-badge', statusBadgeClass(req.status)]">
              {{ REQUEST_STATUS_LABELS[req.status] }}
            </span>
          </div>
        </div>

        <div class="request-services">
          <span v-for="p in req.prestations" :key="p" class="service-tag">{{ categoryName(p) }}</span>
          <span v-if="req.recurring" class="service-tag service-tag--recurring">Récurrent</span>
        </div>

        <div class="request-meta">
          <span v-if="req.desiredAt" class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Intervention : {{ formatDate(req.desiredAt) }}
          </span>
          <span v-if="req.address || req.ville" class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg>
            {{ [req.address, req.codePostal, req.ville].filter(Boolean).join(', ') }}
          </span>
          <span v-if="req.estimatedHours" class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {{ req.estimatedHours }}h estimées
          </span>
          <span class="meta-item meta-item--muted">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Reçue le {{ formatDate(req.createdAt) }}
          </span>
        </div>

        <p v-if="req.subject" class="request-subject">{{ req.subject }}</p>
        <p v-if="req.description" class="request-desc">{{ req.description }}</p>

        <div v-if="req.proposals?.length" class="proposals">
          <div v-for="(p, i) in req.proposals" :key="i" class="proposal-item">
            <span class="proposal-by">{{ p.by === 'provider' ? 'Prestataire' : 'Client' }}</span>
            <span>propose le {{ formatDate(p.date) }}</span>
            <span v-if="p.comment" class="proposal-comment">— {{ p.comment }}</span>
          </div>
        </div>

        <template v-if="req._perspective === 'provider' && ['sent_to_provider', 'client_accepted'].includes(req.status)">
          <div v-if="proposingId !== req._id" class="request-actions">
            <template v-if="req.status === 'sent_to_provider'">
              <button class="btn-accept" @click="accept(req._id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Accepter
              </button>
            </template>
            <button class="btn-propose" @click="openPropose(req._id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Proposer une date
            </button>
            <button class="btn-refuse" @click="refuse(req._id)">Refuser</button>
          </div>
          <div v-else class="propose-form">
            <div class="propose-fields">
              <div class="propose-field">
                <label>Date et heure proposées</label>
                <input v-model="proposeDate" type="datetime-local" :min="new Date().toISOString().slice(0,16)" />
              </div>
              <div class="propose-field">
                <label>Message <span class="optional">(facultatif)</span></label>
                <input v-model="proposeComment" type="text" placeholder="Ex : je suis disponible à partir de 9h" />
              </div>
            </div>
            <div class="propose-actions">
              <button class="btn-accept" :disabled="!proposeDate" @click="propose(req._id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Envoyer la proposition
              </button>
              <button class="btn-refuse" @click="proposingId = null">Annuler</button>
            </div>
          </div>
        </template>
        <div v-if="req._perspective === 'provider' && req.status === 'scheduled'" class="request-actions">
          <button class="btn-complete" @click="complete(req._id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Marquer comme terminée
          </button>
          <button class="btn-refuse" @click="cancel(req._id)">Annuler</button>
        </div>

        <!-- Messagerie inline -->
        <div v-if="['sent_to_provider','client_confirmed','provider_proposed','client_accepted','scheduled'].includes(req.status)" class="msg-zone">
          <div v-if="messageSent === req._id" class="msg-sent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
            Message envoye — le client a recu un email.
            <a href="/app/messagerie" class="msg-view-link">Voir tous les messages</a>
          </div>
          <template v-else-if="messagingId === req._id">
            <textarea v-model="messageContent" rows="2" class="msg-textarea" placeholder="Votre message au client..."></textarea>
            <div class="msg-actions">
              <button class="btn-msg-send" :disabled="!messageContent.trim()" @click="submitMessage(req._id)">Envoyer</button>
              <button class="btn-msg-cancel" @click="messagingId = null">Annuler</button>
            </div>
          </template>
          <button v-else class="btn-msg-open" @click="openMessage(req._id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Envoyer un message
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.demandes { display: flex; flex-direction: column; gap: 1.5rem; }

.page-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e9e5d6;
}
.header-eyebrow {
  font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em;
  text-transform: uppercase; color: #a8c47a; margin: 0 0 0.35rem;
}
.page-header h1 { font-size: 1.5rem; font-weight: 900; color: #1a1a0e; margin: 0 0 0.2rem; letter-spacing: -0.02em; }
.header-sub { font-size: 0.85rem; color: #9ca3af; margin: 0; }

/* Filters */
.filter-tabs { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.filter-tab {
  padding: 0.4rem 1rem;
  border: 1.5px solid #e9e5d6;
  border-radius: 999px;
  background: #f5f2eb;
  color: #515F37;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.filter-tab:hover { border-color: #a8c47a; background: #eef2e8; }
.filter-tab.active { background: #3a5020; border-color: #3a5020; color: #fff; }

/* Empty */
.empty { text-align: center; padding: 3rem 1rem; color: #9ca3af; }
.error-msg { color: #ef4444; font-size: 0.875rem; }

/* List */
.request-list { display: flex; flex-direction: column; gap: 0.875rem; }

.request-card {
  background: #FCFAF5;
  border: 1.5px solid #e9e5d6;
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.request-card:hover { border-color: #c8d9a6; box-shadow: 0 4px 16px rgba(58,80,32,0.07); }

.request-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }

.badges { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; justify-content: flex-end; }

.perspective-badge {
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  white-space: nowrap;
}
.badge-provider { background: #eef2e8; color: #3a5020; border: 1px solid #a8c47a; }
.badge-requester { background: rgba(99,102,241,0.08); color: #4f46e5; border: 1px solid rgba(99,102,241,0.25); }

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
.badge-green { background: rgba(168,196,122,0.18); color: #3a5020; border: 1px solid rgba(168,196,122,0.35); }
.badge-red { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.badge-orange { background: rgba(230,197,83,0.15); color: #7a6000; border: 1px solid rgba(230,197,83,0.35); }
.badge-blue { background: rgba(81,95,55,0.1); color: #515F37; border: 1px solid rgba(81,95,55,0.2); }

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
.service-tag--recurring {
  background: rgba(230,197,83,0.15);
  color: #7a6000;
  border-color: rgba(230,197,83,0.4);
}

.request-meta { display: flex; gap: 1rem; flex-wrap: wrap; }
.meta-item {
  display: flex; align-items: center; gap: 0.35rem;
  font-size: 0.8rem; color: #6b7280;
}
.meta-item svg { width: 13px; height: 13px; flex-shrink: 0; }
.meta-item--muted { color: #b5ae94; font-style: italic; }

.request-subject {
  font-size: 0.875rem; font-weight: 700;
  color: #1a1a0e; margin: 0;
}

.request-desc {
  font-size: 0.875rem;
  color: #515F37;
  margin: 0;
  padding: 0.75rem 0.875rem;
  background: #f5f2eb;
  border-radius: 8px;
  border-left: 3px solid #a8c47a;
}

.proposals {
  display: flex; flex-direction: column; gap: 0.4rem;
  padding: 0.6rem 0.875rem;
  background: rgba(230,197,83,0.08);
  border-radius: 8px;
  border-left: 3px solid rgba(230,197,83,0.5);
}
.proposal-item {
  display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center;
  font-size: 0.8rem; color: #6b7280;
}
.proposal-by { font-weight: 700; color: #515F37; }
.proposal-comment { color: #9ca3af; }

.request-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }

.btn-propose {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.5rem 1.25rem;
  background: #FCFAF5; color: #515F37;
  border: 1.5px solid #a8c47a;
  border-radius: 10px;
  font-weight: 600; font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer; transition: all 0.15s;
}
.btn-propose svg { width: 14px; height: 14px; }
.btn-propose:hover { background: #eef2e8; border-color: #7aaa3e; }

.propose-form {
  display: flex; flex-direction: column; gap: 0.875rem;
  padding: 1rem;
  background: #f5f2eb;
  border-radius: 12px;
  border: 1.5px solid #d6cda4;
}
.propose-fields { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.propose-field { display: flex; flex-direction: column; gap: 0.35rem; flex: 1; min-width: 180px; }
.propose-field label { font-size: 0.8rem; font-weight: 600; color: #515F37; }
.propose-field .optional { font-weight: 400; color: #9ca3af; }
.propose-field input {
  padding: 0.5rem 0.75rem;
  border: 1.5px solid #d6cda4; border-radius: 8px;
  font-size: 0.875rem; font-family: inherit; color: #1a1a0e;
  background: #FCFAF5;
  transition: border-color 0.15s;
}
.propose-field input:focus { outline: none; border-color: #515F37; }
.propose-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }

.btn-complete {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.5rem 1.25rem;
  background: #f0ede3; color: #3a5020;
  border: 1.5px solid #a8c47a;
  border-radius: 10px;
  font-weight: 700; font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer; transition: all 0.15s;
}
.btn-complete svg { width: 14px; height: 14px; }
.btn-complete:hover { background: #e2ddd0; border-color: #7aaa3e; }

.btn-accept {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.5rem 1.25rem;
  background: #3a5020; color: #fff;
  border: none; border-radius: 10px;
  font-weight: 700; font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer; transition: background 0.15s, transform 0.15s;
}
.btn-accept svg { width: 14px; height: 14px; }
.btn-accept:hover { background: #253515; transform: translateY(-1px); }

.btn-refuse {
  padding: 0.5rem 1.25rem;
  background: #FCFAF5; color: #b91c1c;
  border: 1.5px solid #fecaca;
  border-radius: 10px;
  font-weight: 600; font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer; transition: all 0.15s;
}
.btn-refuse:hover { background: #fef2f2; border-color: #fca5a5; }

/* Skeleton */
.skeleton-list { display: flex; flex-direction: column; gap: 0.875rem; }
.skeleton-card { border-radius: 16px; overflow: hidden; }
.skeleton {
  background: linear-gradient(90deg, #f3f0e8 25%, #ebe8de 50%, #f3f0e8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* Messagerie inline */
.msg-zone { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed #e4e0d0; }

.btn-msg-open {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.35rem 0.875rem;
  border: 1.5px solid #d6cda4; border-radius: 8px;
  background: #f5f2eb; color: #515F37;
  font-size: 0.78rem; font-weight: 600; font-family: inherit; cursor: pointer;
  transition: all 0.15s;
}
.btn-msg-open:hover { border-color: #a8c47a; background: #eef2e8; }

.msg-textarea {
  width: 100%; padding: 0.5rem 0.75rem;
  border: 1.5px solid #e9e5d6; border-radius: 8px;
  font-size: 0.875rem; font-family: inherit; color: #1a1a0e;
  background: #f5f2eb; resize: none;
  transition: border-color 0.15s; margin-bottom: 0.5rem;
}
.msg-textarea:focus { outline: none; border-color: #515F37; background: #FCFAF5; }

.msg-actions { display: flex; gap: 0.5rem; }
.btn-msg-send {
  padding: 0.4rem 1rem; background: #3a5020; color: #fff;
  border: none; border-radius: 8px; cursor: pointer;
  font-weight: 700; font-size: 0.8rem; font-family: inherit;
  transition: background 0.15s;
}
.btn-msg-send:hover:not(:disabled) { background: #253515; }
.btn-msg-send:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-msg-cancel {
  padding: 0.4rem 0.875rem; background: none; color: #9ca3af;
  border: 1.5px solid #e9e5d6; border-radius: 8px;
  cursor: pointer; font-size: 0.8rem; font-family: inherit;
}

.msg-sent {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.8rem; color: #515F37; font-weight: 600;
}
.msg-view-link { color: #3a5020; text-decoration: underline; margin-left: 0.5rem; font-weight: 600; }

@media (max-width: 600px) {
  .request-top { flex-direction: column; gap: 0.5rem; }
  .request-actions { flex-direction: column; }
  .btn-accept, .btn-refuse { width: 100%; justify-content: center; }
}
</style>
