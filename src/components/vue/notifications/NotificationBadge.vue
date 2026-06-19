<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../../services/api';

const unreadCount = ref(0);
const loading = ref(true);

onMounted(() => {
  loadUnreadCount();
  // Poll every 30 seconds
  setInterval(loadUnreadCount, 30000);
});

async function loadUnreadCount() {
  try {
    const { data } = await api.get('/notifications/unread-count');
    unreadCount.value = data.unreadCount;
  } catch (e) {
    // Silently fail if not authenticated or API error
    loading.value = false;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <a href="/app/notifications/" class="notification-badge" :class="{ 'has-unread': unreadCount > 0 }">
    <span class="icon">🔔</span>
    <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
  </a>
</template>

<style scoped>
.notification-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: transparent;
  color: #3a5020;
  text-decoration: none;
  transition: background 0.15s;
  font-size: 1.2rem;
}

.notification-badge:hover {
  background: #f0f5e8;
}

.notification-badge.has-unread {
  background: #f0f5e8;
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  background: #dc2626;
  color: #fff;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: bold;
  border: 2px solid #fff;
}
</style>
