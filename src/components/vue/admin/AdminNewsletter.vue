<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../../services/api';

const activeTab = ref<'subscribers' | 'compose' | 'history'>('subscribers');
const subscribers = ref<any[]>([]);
const history = ref<any[]>([]);
const loading = ref(false);

// Compose form
const compose = ref({
  title: '',
  content: '',
  ctaText: 'Voir Gardee',
  ctaLink: 'https://gardee.fr',
  schedule: false,
  scheduleDate: '',
  scheduleTime: '',
  segmentType: 'all' as 'all' | 'client' | 'prestataire',
});


onMounted(async () => {
  await loadSubscribers();
  await loadHistory();
});

const loadSubscribers = async () => {
  try {
    loading.value = true;
    const res = await api.get('/newsletter/subscribers');
    subscribers.value = res.data || [];
  } catch (err) {
    console.error('Error loading subscribers:', err);
  } finally {
    loading.value = false;
  }
};

const loadHistory = async () => {
  try {
    const res = await api.get('/newsletter/history');
    history.value = res.data || [];
  } catch (err) {
    console.error('Error loading history:', err);
  }
};

const sendNewsletter = async () => {
  if (!compose.value.title || !compose.value.content) {
    alert('Titre et contenu requis');
    return;
  }

  try {
    loading.value = true;
    await api.post('/newsletter/send', {
      title: compose.value.title,
      content: compose.value.content,
      ctaText: compose.value.ctaText,
      ctaLink: compose.value.ctaLink,
      scheduledFor: compose.value.schedule ? `${compose.value.scheduleDate}T${compose.value.scheduleTime}` : null,
      segmentType: compose.value.segmentType,
    });

    alert('Newsletter envoyée!');
    compose.value = { title: '', content: '', ctaText: 'Voir Gardee', ctaLink: 'https://gardee.fr', schedule: false, scheduleDate: '', scheduleTime: '', segmentType: 'all' };
    await loadHistory();
  } catch (err) {
    alert('Erreur lors de l\'envoi');
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const subscriberCount = (type?: string) => {
  if (!type) return subscribers.value.length;
  return subscribers.value.filter(s => s.userType === type).length;
};

</script>

<template>
  <div class="admin-newsletter">
    <div class="page-header">
      <p class="header-eyebrow">Communication</p>
      <h1>Newsletter</h1>
      <p class="header-sub">Gérez vos envois email et abonnés</p>
    </div>

    <div class="tabs">
      <button
        v-for="tab in ['subscribers', 'compose', 'history']"
        :key="tab"
        :class="['tab-btn', { active: activeTab === tab }]"
        @click="activeTab = tab as any"
      >
        <span v-if="tab === 'subscribers'">📧 Abonnés ({{ subscribers.length }})</span>
        <span v-else-if="tab === 'compose'">✍️ Composer</span>
        <span v-else>📊 Historique</span>
      </button>
    </div>

    <!-- SUBSCRIBERS TAB -->
    <div v-if="activeTab === 'subscribers'" class="tab-content">
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-number">{{ subscriberCount() }}</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">{{ subscriberCount('client') }}</div>
          <div class="stat-label">Clients</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">{{ subscriberCount('prestataire') }}</div>
          <div class="stat-label">Prestataires</div>
        </div>
      </div>

      <div class="subscribers-list">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Type</th>
              <th>Date d'abonnement</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sub in subscribers" :key="sub._id">
              <td>{{ sub.email }}</td>
              <td>
                <span v-if="sub.userType" class="badge">{{ sub.userType === 'client' ? 'Client' : 'Prestataire' }}</span>
                <span v-else class="badge badge-gray">Autre</span>
              </td>
              <td>{{ new Date(sub.subscriptionDate).toLocaleDateString('fr-FR') }}</td>
              <td>
                <span v-if="sub.subscribed" class="status status-active">✓ Actif</span>
                <span v-else class="status status-inactive">✗ Inactif</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- COMPOSE TAB -->
    <div v-if="activeTab === 'compose'" class="tab-content">
      <div class="compose-form">
        <div class="form-group">
          <label>Titre de la newsletter</label>
          <input v-model="compose.title" type="text" placeholder="Ex: Les top prestataires de la semaine">
        </div>

        <div class="form-group">
          <label>Contenu</label>
          <textarea v-model="compose.content" rows="8" placeholder="Contenu de la newsletter..."></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Texte du bouton CTA</label>
            <input v-model="compose.ctaText" type="text" placeholder="Voir Gardee">
          </div>
          <div class="form-group">
            <label>Lien du bouton</label>
            <input v-model="compose.ctaLink" type="url" placeholder="https://gardee.fr">
          </div>
        </div>

        <div class="form-group">
          <label>Segmentation</label>
          <select v-model="compose.segmentType">
            <option value="all">Tous les abonnés</option>
            <option value="client">Clients seulement</option>
            <option value="prestataire">Prestataires seulement</option>
          </select>
        </div>

        <div class="form-group checkbox">
          <input v-model="compose.schedule" type="checkbox" id="schedule">
          <label for="schedule">Programmer l'envoi</label>
        </div>

        <div v-if="compose.schedule" class="form-row">
          <div class="form-group">
            <label>Date</label>
            <input v-model="compose.scheduleDate" type="date">
          </div>
          <div class="form-group">
            <label>Heure</label>
            <input v-model="compose.scheduleTime" type="time">
          </div>
        </div>

        <div class="preview">
          <h3>Aperçu</h3>
          <div class="preview-box">
            <p><strong>{{ compose.title || 'Titre de la newsletter' }}</strong></p>
            <p>{{ compose.content || 'Le contenu s\'affichera ici...' }}</p>
            <a :href="compose.ctaLink" class="btn-preview">{{ compose.ctaText }}</a>
          </div>
        </div>

        <button @click="sendNewsletter" :disabled="loading" class="btn-send">
          {{ compose.schedule ? '📅 Programmer' : '✉️ Envoyer maintenant' }}
        </button>
      </div>
    </div>

    <!-- HISTORY TAB -->
    <div v-if="activeTab === 'history'" class="tab-content">
      <div v-if="history.length === 0" class="empty-state">
        <p>Aucun envoi pour le moment</p>
      </div>

      <div v-else class="history-list">
        <div v-for="item in history" :key="item._id" class="history-item">
          <div class="history-header">
            <h4>{{ item.title }}</h4>
            <span class="badge">{{ item.segmentType === 'all' ? 'Tous' : item.segmentType }}</span>
          </div>
          <div class="history-meta">
            <span>📤 Envoyé: {{ new Date(item.sentAt).toLocaleDateString('fr-FR') }}</span>
            <span>👁️ Ouvertures: {{ item.opens || 0 }}</span>
            <span>🔗 Clics: {{ item.clicks || 0 }}</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.admin-newsletter {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.header-eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #a8c47a;
  margin: 0 0 0.5rem;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 800;
  color: #1f2937;
  margin: 0 0 0.5rem;
}

.header-sub {
  color: #6b7280;
  margin: 0;
}

/* TABS */
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.tab-btn {
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  color: #6b7280;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover { color: #374151; }
.tab-btn.active {
  color: #5f7a39;
  border-bottom-color: #5f7a39;
}

.tab-content { margin-top: 2rem; }

/* SUBSCRIBERS */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-box {
  background: #f3f4f6;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
}

.stat-number {
  font-size: 2rem;
  font-weight: 800;
  color: #1f2937;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.5rem;
}

.subscribers-list {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  background: #f9fafb;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

td {
  padding: 1rem;
  border-bottom: 1px solid #f3f4f6;
}

.badge {
  display: inline-block;
  background: #a8c47a;
  color: #fff;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

.badge-gray {
  background: #d1d5db;
  color: #374151;
}

.status {
  font-size: 0.875rem;
  font-weight: 600;
}

.status-active { color: #059669; }
.status-inactive { color: #dc2626; }

/* COMPOSE */
.compose-form {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 2rem;
  max-width: 800px;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #a8c47a;
  box-shadow: 0 0 0 3px rgba(168, 196, 122, 0.1);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group.checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-group.checkbox input {
  width: auto;
  margin: 0;
}

.form-group.checkbox label {
  margin: 0;
}

.preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 2rem 0;
}

.preview h3 {
  margin: 0 0 1rem;
  color: #1f2937;
}

.preview-box {
  background: #fff;
  border-radius: 8px;
  padding: 1rem;
  color: #374151;
  line-height: 1.6;
}

.btn-preview {
  display: inline-block;
  background: #5f7a39;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  margin-top: 1rem;
}

.btn-send {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #5f7a39 0%, #515F37 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 800;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-send:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(95, 122, 57, 0.35);
}

.btn-send:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* HISTORY */
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.history-list {
  display: grid;
  gap: 1rem;
}

.history-item {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
}

.history-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.history-header h4 {
  margin: 0;
  color: #1f2937;
  flex: 1;
}

.history-meta {
  display: flex;
  gap: 2rem;
  font-size: 0.9rem;
  color: #6b7280;
}

@media (max-width: 768px) {
  .form-row { grid-template-columns: 1fr; }
  .history-meta { flex-direction: column; gap: 0.5rem; }
}
</style>
