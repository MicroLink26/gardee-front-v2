<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../../services/api';
import AvatarImage from '../AvatarImage.vue';
import { useCategoryName } from '../../../composables/useCategoryName';
import type { User } from '../../../types';

const { categoryName, categoriesStore } = useCategoryName();

const users = ref<User[]>([]);
const loading = ref(true);
const expandedId = ref<string | null>(null);

const rejectModal = ref<{ userId: string; name: string } | null>(null);
const rejectType = ref<'temporary' | 'permanent'>('temporary');
const rejectReason = ref('');
const rejectLoading = ref(false);

function prest(user: User) {
  return user.prestataire as Record<string, unknown> | undefined;
}

function toggle(id: string) {
  expandedId.value = expandedId.value === id ? null : id;
}

async function load() {
  loading.value = true;
  const { data } = await api.get('/admin/pending?pageSize=50');
  users.value = data.items;
  loading.value = false;
}

async function validate(id: string) {
  await api.post(`/admin/validate/${id}`);
  users.value = users.value.filter(u => u._id !== id);
  if (expandedId.value === id) expandedId.value = null;
}

function openRejectModal(id: string, name: string) {
  rejectModal.value = { userId: id, name };
  rejectType.value = 'temporary';
  rejectReason.value = '';
}

async function confirmReject() {
  if (!rejectModal.value) return;
  rejectLoading.value = true;
  try {
    await api.put(`/admin/prestataires/${rejectModal.value.userId}/reject`, {
      type: rejectType.value,
      reason: rejectReason.value.trim() || undefined,
    });
    users.value = users.value.filter(u => u._id !== rejectModal.value!.userId);
    if (expandedId.value === rejectModal.value.userId) expandedId.value = null;
    rejectModal.value = null;
  } finally {
    rejectLoading.value = false;
  }
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
  <div class="admin-pending">
    <div class="page-header">
      <div>
        <p class="header-eyebrow">Administration</p>
        <h1>Prestataires en attente</h1>
        <p class="header-sub">{{ users.length }} candidature{{ users.length > 1 ? 's' : '' }} à examiner</p>
      </div>
    </div>

    <div v-if="loading" class="skeleton-list">
      <div v-for="i in 3" :key="i" class="skeleton-card">
        <div class="skeleton" style="height:88px;border-radius:14px"></div>
      </div>
    </div>

    <div v-else-if="!users.length" class="empty">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h3>Tout est à jour !</h3>
      <p>Aucun prestataire en attente de validation.</p>
    </div>

    <div v-else class="user-list">
      <div v-for="user in users" :key="user._id" class="user-card">

        <!-- Ligne principale -->
        <div class="user-row">
          <div class="user-photo">
            <AvatarImage :userId="user._id" :prenom="user.prenom" :nom="user.nom" :imageUrl="prest(user)?.profil_image?.secure_url as string" :alt="`${user.prenom} ${user.nom}`" />
          </div>

          <div class="user-info">
            <div class="user-name">{{ user.prenom }} {{ user.nom }}</div>
            <div class="user-meta">
              <span>{{ user.email }}</span>
              <span v-if="user.telephone"> · {{ user.telephone }}</span>
              <span v-if="prest(user)?.ville"> ·
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;vertical-align:-1px"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg>
                {{ prest(user)?.ville }} ({{ prest(user)?.codePostal }})
              </span>
            </div>
            <div class="user-tags">
              <span v-for="p in (prest(user)?.prestations as string[] ?? []).slice(0, 5)" :key="p" class="tag">{{ categoryName(p) }}</span>
              <span v-if="prest(user)?.tarifHoraire" class="tag tag--price">{{ prest(user)?.tarifHoraire }} €/h</span>
              <span v-if="prest(user)?.isEntrepreneur" class="tag tag--pro">Pro</span>
              <span v-if="prest(user)?.qualifElagage" class="tag tag--qualif">Qualif. élagage</span>
            </div>
          </div>

          <div class="user-actions">
            <button :class="['btn-details', { active: expandedId === user._id }]" @click="toggle(user._id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ expandedId === user._id ? 'Masquer' : 'Détails' }}
            </button>
            <button class="btn-delete" @click="openRejectModal(user._id, `${user.prenom} ${user.nom}`)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              Refuser
            </button>
            <button class="btn-validate" @click="validate(user._id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Valider
            </button>
          </div>
        </div>

        <!-- Panneau de détails expandable -->
        <div v-if="expandedId === user._id" class="detail-panel">
          <div class="detail-grid">

            <div v-if="prest(user)?.description" class="detail-full">
              <span class="detail-label">Description</span>
              <p class="detail-desc">{{ prest(user)?.description }}</p>
            </div>

            <div class="detail-item">
              <span class="detail-label">Adresse</span>
              <span class="detail-val">
                {{ [prest(user)?.adresse, prest(user)?.codePostal, prest(user)?.ville].filter(Boolean).join(', ') || '—' }}
              </span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Téléphone</span>
              <span class="detail-val">{{ user.telephone || '—' }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Inscrit le</span>
              <span class="detail-val">{{ formatDate(user.createdAt) }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Statut pro</span>
              <span class="detail-val">{{ prest(user)?.isEntrepreneur ? 'Auto-entrepreneur / Entreprise' : 'Particulier' }}</span>
            </div>

            <div v-if="prest(user)?.siret" class="detail-item">
              <span class="detail-label">SIRET</span>
              <span class="detail-val detail-mono">{{ prest(user)?.siret }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Matériel</span>
              <span :class="['detail-val', prest(user)?.materielOK ? 'val-yes' : 'val-no']">
                {{ prest(user)?.materielOK ? 'Inclus' : 'Non inclus' }}
              </span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Qualif. élagage</span>
              <span :class="['detail-val', prest(user)?.qualifElagage ? 'val-yes' : 'val-no']">
                {{ prest(user)?.qualifElagage ? 'Oui' : 'Non' }}
              </span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Contact commercial</span>
              <span class="detail-val">{{ prest(user)?.contactCom ? 'Accepté' : 'Refusé' }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">CGU acceptées</span>
              <span :class="['detail-val', prest(user)?.cgu ? 'val-yes' : 'val-no']">
                {{ prest(user)?.cgu ? 'Oui' : 'Non' }}
              </span>
            </div>

          </div>

          <div class="detail-actions">
            <button class="btn-delete btn-delete--lg" @click="openRejectModal(user._id, `${user.prenom} ${user.nom}`)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              Refuser ce prestataire
            </button>
            <button class="btn-validate btn-validate--lg" @click="validate(user._id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg>
              Valider ce prestataire
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- Reject modal -->
  <div v-if="rejectModal" class="reject-overlay" @click.self="rejectModal = null">
    <div class="reject-modal">
      <h3>Refuser la candidature</h3>
      <p class="reject-name">{{ rejectModal.name }}</p>

      <div class="reject-type">
        <button
          :class="['type-btn', { 'type-btn--on': rejectType === 'temporary' }]"
          @click="rejectType = 'temporary'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Refus temporaire
          <span class="type-hint">L'adresse reste utilisable</span>
        </button>
        <button
          :class="['type-btn', 'type-btn--danger', { 'type-btn--on': rejectType === 'permanent' }]"
          @click="rejectType = 'permanent'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          Refus définitif
          <span class="type-hint">L'adresse est bannie</span>
        </button>
      </div>

      <div class="reject-reason-field">
        <label>Motif du refus <span class="optional">(facultatif)</span></label>
        <textarea v-model="rejectReason" rows="3" placeholder="Précisez la raison du refus pour informer le candidat…"></textarea>
      </div>

      <div class="reject-actions">
        <button class="btn-cancel" @click="rejectModal = null">Annuler</button>
        <button
          :class="['btn-confirm-reject', { 'btn-confirm-reject--permanent': rejectType === 'permanent' }]"
          :disabled="rejectLoading"
          @click="confirmReject"
        >
          {{ rejectLoading ? 'En cours…' : rejectType === 'permanent' ? 'Bannir définitivement' : 'Refuser temporairement' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.admin-pending { display: flex; flex-direction: column; gap: 1.5rem; }

.page-header { padding-bottom: 1.5rem; border-bottom: 1px solid #e9e5d6; }
.header-eyebrow { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #a8c47a; margin: 0 0 0.35rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 900; color: #1a1a0e; margin: 0 0 0.2rem; letter-spacing: -0.02em; }
.header-sub { font-size: 0.85rem; color: #9ca3af; margin: 0; }

.empty {
  text-align: center; padding: 4rem 2rem;
  display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
}
.empty-icon {
  width: 56px; height: 56px; border-radius: 50%;
  background: rgba(168,196,122,0.18); color: #3a5020;
  border: 2px solid rgba(168,196,122,0.3);
  display: flex; align-items: center; justify-content: center;
}
.empty-icon svg { width: 24px; height: 24px; }
.empty h3 { font-size: 1.1rem; font-weight: 700; color: #1a1a0e; margin: 0; }
.empty p { font-size: 0.875rem; color: #9ca3af; margin: 0; }

.user-list { display: flex; flex-direction: column; gap: 0.75rem; }

.user-card {
  display: flex; flex-direction: column;
  background: #FCFAF5; border: 1.5px solid #e9e5d6; border-radius: 16px;
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.user-card:hover { border-color: #c8d9a6; box-shadow: 0 4px 16px rgba(58,80,32,0.07); }

.user-row {
  display: flex; align-items: center; gap: 1.125rem;
  padding: 1.125rem;
}

.user-photo {
  width: 52px; height: 52px; border-radius: 50%; overflow: hidden;
  background: #f0ede3; flex-shrink: 0;
}
.user-photo img { width: 100%; height: 100%; object-fit: cover; }
.photo-initials {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 1rem; color: #515F37;
}

.user-info { flex: 1; min-width: 0; }
.user-name { font-size: 0.9rem; font-weight: 700; color: #1a1a0e; }
.user-meta {
  display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;
  font-size: 0.775rem; color: #9ca3af; margin-top: 0.2rem;
}
.user-tags { display: flex; gap: 0.3rem; flex-wrap: wrap; margin-top: 0.4rem; }
.tag {
  background: #f0ede3; color: #515F37;
  border: 1px solid #d6cda4;
  padding: 0.15rem 0.5rem; border-radius: 999px;
  font-size: 0.72rem; font-weight: 600;
}
.tag--price { background: #1a1a0e; color: #d6cda4; border-color: #1a1a0e; }
.tag--pro { background: #1e3a8a; color: #bfdbfe; border-color: #1e3a8a; }
.tag--qualif { background: #065f46; color: #a7f3d0; border-color: #065f46; }

.user-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }

.btn-view {
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.45rem 0.875rem;
  border: 1.5px solid #e9e5d6; border-radius: 8px;
  text-decoration: none; color: #515F37;
  font-size: 0.8rem; font-weight: 600;
  background: #f5f2eb;
  transition: all 0.15s;
}
.btn-view svg { width: 13px; height: 13px; }
.btn-view:hover { border-color: #a8c47a; background: #eef2e8; }

.btn-details {
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.45rem 0.875rem;
  border: 1.5px solid #e9e5d6; border-radius: 8px;
  color: #515F37; font-size: 0.8rem; font-weight: 600;
  background: #f5f2eb; cursor: pointer; font-family: inherit;
  transition: all 0.15s;
}
.btn-details svg { width: 13px; height: 13px; }
.btn-details:hover { border-color: #a8c47a; background: #eef2e8; }
.btn-details.active { background: #eef2e8; border-color: #a8c47a; color: #3a5020; }

.detail-panel {
  border-top: 1px solid #e9e5d6;
  padding: 1.125rem;
  background: #f8f6f0;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.875rem;
}

.detail-full { grid-column: 1 / -1; }

.detail-item {
  display: flex; flex-direction: column; gap: 0.2rem;
}

.detail-label {
  font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.1em; color: #9ca3af;
}

.detail-val {
  font-size: 0.85rem; color: #1a1a0e; font-weight: 500;
}

.detail-mono {
  font-family: monospace; letter-spacing: 0.05em;
}

.detail-desc {
  font-size: 0.875rem; color: #374151; line-height: 1.55;
  margin: 0.3rem 0 0; white-space: pre-wrap;
}

.val-yes { color: #166534; font-weight: 600; }
.val-no { color: #9ca3af; }

.detail-actions {
  margin-top: 1.125rem; display: flex; justify-content: flex-end;
}

.btn-validate--lg {
  padding: 0.6rem 1.5rem;
  font-size: 0.875rem;
}

.btn-delete {
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.45rem 0.875rem;
  background: #fff1f2; color: #b91c1c;
  border: 1.5px solid #fecaca; border-radius: 8px;
  cursor: pointer; font-weight: 600; font-size: 0.8rem;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s;
}
.btn-delete:hover { background: #fee2e2; border-color: #f87171; }
.btn-delete--lg { padding: 0.6rem 1.25rem; font-size: 0.875rem; }

.btn-validate {
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.45rem 1rem;
  background: #3a5020; color: #fff;
  border: none; border-radius: 8px;
  cursor: pointer; font-weight: 700; font-size: 0.8rem;
  font-family: inherit;
  transition: background 0.15s, transform 0.15s;
}
.btn-validate svg { width: 13px; height: 13px; }
.btn-validate:hover { background: #253515; transform: translateY(-1px); }

.skeleton-list { display: flex; flex-direction: column; gap: 0.75rem; }
.skeleton-card { border-radius: 16px; overflow: hidden; }
.skeleton {
  background: linear-gradient(90deg, #f3f0e8 25%, #ebe8de 50%, #f3f0e8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

@media (max-width: 600px) {
  .user-card { flex-wrap: wrap; }
  .user-actions { width: 100%; justify-content: flex-end; }
}

/* ── REJECT MODAL ── */
.reject-overlay {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center; padding: 1rem;
}
.reject-modal {
  background: #FCFAF5; border-radius: 18px;
  padding: 1.75rem; max-width: 460px; width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
.reject-modal h3 { font-size: 1.1rem; font-weight: 800; color: #1a1a0e; margin: 0 0 0.25rem; }
.reject-name { font-size: 0.85rem; color: #6b7280; margin: 0 0 1.25rem; }
.reject-type { display: flex; gap: 0.75rem; margin-bottom: 1.25rem; }
.type-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
  padding: 0.875rem 0.5rem;
  border: 2px solid #e9e5d6; border-radius: 12px;
  background: #f5f2eb; color: #515F37;
  font-size: 0.8rem; font-weight: 600; cursor: pointer;
  transition: all 0.15s; font-family: inherit;
}
.type-btn:hover { border-color: #a8c47a; background: #eef2e8; }
.type-btn--on { border-color: #3a5020; background: #eef2e8; color: #3a5020; }
.type-btn--danger { color: #b91c1c; background: #fff1f2; border-color: #fecaca; }
.type-btn--danger:hover { border-color: #f87171; background: #fee2e2; }
.type-btn--danger.type-btn--on { border-color: #dc2626; background: #fee2e2; color: #991b1b; }
.type-hint { font-size: 0.68rem; font-weight: 400; color: inherit; opacity: 0.7; }
.reject-reason-field { margin-bottom: 1.25rem; }
.reject-reason-field label { display: block; font-size: 0.75rem; font-weight: 700; color: #6b6347; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.4rem; }
.optional { font-weight: 400; text-transform: none; color: #9ca3af; }
.reject-reason-field textarea {
  width: 100%; padding: 0.65rem 0.875rem;
  border: 1.5px solid #e9e5d6; border-radius: 10px;
  font-size: 0.875rem; color: #1a1a0e; background: #f5f2eb;
  outline: none; resize: vertical; font-family: inherit;
  transition: border-color 0.15s;
}
.reject-reason-field textarea:focus { border-color: #3a5020; }
.reject-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
.btn-cancel {
  padding: 0.65rem 1.25rem;
  background: none; color: #6b7280; border: 1.5px solid #e9e5d6; border-radius: 10px;
  font-size: 0.875rem; font-weight: 600; cursor: pointer; font-family: inherit;
  transition: all 0.15s;
}
.btn-cancel:hover { border-color: #9ca3af; color: #374151; }
.btn-confirm-reject {
  padding: 0.65rem 1.5rem;
  background: #d97706; color: #fff; border: none; border-radius: 10px;
  font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: inherit;
  transition: background 0.15s;
}
.btn-confirm-reject:hover { background: #b45309; }
.btn-confirm-reject--permanent { background: #dc2626; }
.btn-confirm-reject--permanent:hover { background: #b91c1c; }
.btn-confirm-reject:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
