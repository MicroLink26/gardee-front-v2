<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../../services/api';

interface Notification {
  _id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  relatedRequestId?: string;
}

const notifications = ref<Notification[]>([]);
const loading = ref(true);
const error = ref('');
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const unreadFilter = ref(false);

const typeIcons: Record<string, string> = {
  request_created: '🌿',
  request_confirmed: '✓',
  provider_accepted: '✅',
  provider_proposed: '📅',
  provider_refused: '❌',
  client_accepted: '✓',
  client_refused: '✗',
  request_completed: '✓',
  message: '💬',
  other: '📬',
};

onMounted(() => loadNotifications());

async function loadNotifications() {
  loading.value = true;
  error.value = '';
  try {
    const params = new URLSearchParams({
      page: page.value.toString(),
      pageSize: pageSize.toString(),
    });
    if (unreadFilter.value) params.append('unread', 'true');

    const { data } = await api.get(`/notifications?${params}`);
    notifications.value = data.items;
    total.value = data.total;
  } catch (e) {
    error.value = 'Erreur lors du chargement des notifications';
  } finally {
    loading.value = false;
  }
}

async function markAsRead(id: string) {
  try {
    await api.post(`/notifications/${id}/read`);
    const notif = notifications.value.find(n => n._id === id);
    if (notif) notif.read = true;
  } catch (e) {
    console.error('Failed to mark as read:', e);
  }
}

async function markAllAsRead() {
  try {
    await api.post('/notifications/mark-all-read');
    notifications.value.forEach(n => n.read = true);
  } catch (e) {
    console.error('Failed to mark all as read:', e);
  }
}

async function deleteNotification(id: string) {
  try {
    await api.delete(`/notifications/${id}`);
    notifications.value = notifications.value.filter(n => n._id !== id);
    total.value--;
  } catch (e) {
    console.error('Failed to delete notification:', e);
  }
}

function toggleFilter() {
  unreadFilter.value = !unreadFilter.value;
  page.value = 1;
  loadNotifications();
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'À l\'instant';
  if (mins < 60) return `Il y a ${mins}m`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;

  return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
}
</script>

<template>
  <div class="notifications-container">
    <div class="header">
      <h1>Notifications</h1>
      <div class="header-actions">
        <button class="btn-filter" :class="{ active: unreadFilter }" @click="toggleFilter">
          {{ unreadFilter ? '✓ Non lues' : 'Toutes' }}
        </button>
        <button v-if="notifications.some(n => !n.read)" class="btn-mark-all" @click="markAllAsRead">
          Marquer tout comme lu
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">Chargement…</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="notifications.length === 0" class="empty">
      <p>✨ Aucune notification</p>
      <p class="text-muted">Vous recevrez des notifications lorsque des prestataires réagiront à vos demandes</p>
    </div>
    <div v-else class="notifications-list">
      <div v-for="notif in notifications" :key="notif._id" class="notification-item" :class="{ unread: !notif.read }">
        <div class="notif-content" @click="notif.read ? null : markAsRead(notif._id)">
          <div class="notif-icon">{{ typeIcons[notif.type] || typeIcons.other }}</div>
          <div class="notif-text">
            <div class="notif-title">{{ notif.title }}</div>
            <div class="notif-body">{{ notif.body }}</div>
            <div class="notif-time">{{ formatDate(notif.createdAt) }}</div>
          </div>
        </div>
        <button class="btn-delete" @click="deleteNotification(notif._id)" title="Supprimer">
          ✕
        </button>
      </div>
    </div>

    <div v-if="notifications.length > 0" class="pagination">
      <button :disabled="page === 1" @click="page--; loadNotifications()">← Précédent</button>
      <span>Page {{ page }} sur {{ Math.ceil(total / pageSize) }}</span>
      <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++; loadNotifications()">Suivant →</button>
    </div>
  </div>
</template>

<style scoped>
.notifications-container {
  max-width: 700px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
}

.header h1 {
  margin: 0;
  font-size: 1.8rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-filter,
.btn-mark-all {
  padding: 0.6rem 1.2rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.15s;
}

.btn-filter:hover,
.btn-mark-all:hover {
  border-color: #3a5020;
  color: #3a5020;
}

.btn-filter.active {
  background: #3a5020;
  color: #fff;
  border-color: #3a5020;
}

.loading,
.error,
.empty {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.error {
  color: #b91c1c;
}

.empty p {
  margin: 0.5rem 0;
}

.text-muted {
  font-size: 0.875rem;
  color: #9ca3af;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.notification-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  transition: all 0.15s;
}

.notification-item:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.notification-item.unread {
  background: #f0f5e8;
  border-color: #a8c47a;
}

.notification-item.unread:hover {
  background: #e8f0db;
}

.notif-content {
  flex: 1;
  display: flex;
  gap: 1rem;
  cursor: pointer;
}

.notif-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.notif-text {
  flex: 1;
}

.notif-title {
  font-weight: 600;
  color: #1a1a0e;
  margin-bottom: 0.25rem;
}

.notif-body {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.notif-time {
  font-size: 0.75rem;
  color: #9ca3af;
}

.btn-delete {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.15s;
}

.btn-delete:hover {
  background: #f3f4f6;
  color: #6b7280;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

.pagination button {
  padding: 0.6rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.15s;
}

.pagination button:hover:not(:disabled) {
  border-color: #3a5020;
  color: #3a5020;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination span {
  font-size: 0.875rem;
  color: #6b7280;
}
</style>
