<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { isSoundEnabled, setSoundEnabled, initializeAudio } from '../../../services/soundNotifications';
import type { isDesktopNotificationSupported as isSupported } from '../../../services/desktopNotifications';
import { getNotificationPermission, requestNotificationPermission } from '../../../services/desktopNotifications';

const soundEnabled = ref(false);
const desktopNotificationsPermission = ref<NotificationPermission>('denied');
const requestingPermission = ref(false);
const isDesktopNotificationSupported = ref(false);

onMounted(async () => {
  // Check if running in browser context
  if (typeof window === 'undefined') return;

  // Reload sound state from localStorage on mount
  soundEnabled.value = isSoundEnabled();

  // Check desktop notification support
  const isSupported = 'Notification' in window;
  isDesktopNotificationSupported.value = isSupported;

  if (isSupported) {
    desktopNotificationsPermission.value = getNotificationPermission();
  }
});

async function toggleSound(enabled: boolean) {
  soundEnabled.value = enabled;
  setSoundEnabled(enabled);
  if (enabled) {
    await initializeAudio();
  }
}

async function requestDesktopNotificationPermission() {
  if (!isDesktopNotificationSupported()) return;

  requestingPermission.value = true;
  try {
    const granted = await requestNotificationPermission();
    desktopNotificationsPermission.value = granted ? 'granted' : 'denied';
  } finally {
    requestingPermission.value = false;
  }
}

function getPermissionStatus() {
  if (!isDesktopNotificationSupported.value) return 'Non supporté';
  if (desktopNotificationsPermission.value === 'granted') return '✅ Activées';
  if (desktopNotificationsPermission.value === 'denied') return '❌ Bloquées';
  return '⏳ Demander la permission';
}
</script>

<template>
  <div class="notification-preferences">
    <h3>Paramètres de notifications</h3>

    <div class="preference-group">
      <div class="preference-item">
        <div class="preference-label">
          <div class="label-text">
            <h4>Notifications sonores</h4>
            <p>Émettre un son lors de nouvelles notifications</p>
          </div>
        </div>
        <label class="toggle">
          <input type="checkbox" :checked="soundEnabled" @change="toggleSound(!soundEnabled)" />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="preference-item">
        <div class="preference-label">
          <div class="label-text">
            <h4>Notifications de bureau</h4>
            <p>Afficher les notifications du système d'exploitation</p>
          </div>
          <div class="permission-status">
            {{ getPermissionStatus() }}
          </div>
        </div>
        <button
          v-if="isDesktopNotificationSupported && desktopNotificationsPermission !== 'granted'"
          class="btn-request"
          @click="requestDesktopNotificationPermission"
          :disabled="requestingPermission"
        >
          {{ requestingPermission ? 'En cours...' : 'Activer' }}
        </button>
      </div>

      <div class="preference-info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>
          Les notifications de bureau sont affichées même lorsque vous quittez l'application.
          Vous pouvez les désactiver dans les paramètres de votre navigateur à tout moment.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notification-preferences {
  padding-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 2rem;
}

.notification-preferences h3 {
  margin: 0 0 1.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1a1a0e;
}

.preference-group {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.preference-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.preference-label {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.label-text {
  flex: 1;
}

.label-text h4 {
  margin: 0 0 0.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1a1a0e;
}

.label-text p {
  margin: 0;
  font-size: 0.85rem;
  color: #6b7280;
}

.permission-status {
  font-size: 0.85rem;
  font-weight: 600;
  color: #6b7280;
  white-space: nowrap;
}

.toggle {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.toggle input {
  display: none;
}

.toggle-slider {
  display: inline-block;
  width: 44px;
  height: 24px;
  background: #d1d5db;
  border-radius: 12px;
  position: relative;
  transition: background 0.3s;
  flex-shrink: 0;
}

.toggle-slider::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: left 0.3s;
}

.toggle input:checked + .toggle-slider {
  background: #3a5020;
}

.toggle input:checked + .toggle-slider::after {
  left: 22px;
}

.btn-request {
  padding: 0.6rem 1.2rem;
  background: #3a5020;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.btn-request:hover:not(:disabled) {
  background: #2a3c16;
}

.btn-request:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.preference-info {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  align-items: flex-start;
}

.preference-info svg {
  flex-shrink: 0;
  color: #1e40af;
  margin-top: 2px;
}

.preference-info p {
  margin: 0;
  font-size: 0.85rem;
  color: #1e40af;
  line-height: 1.5;
}
</style>
