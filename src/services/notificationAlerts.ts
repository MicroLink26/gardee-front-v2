/**
 * Service to handle desktop and sound notifications for new app notifications
 */

import { api } from './api';
import { playNotificationSound, playBeep, initializeAudio } from './soundNotifications';
import { showDesktopNotification } from './desktopNotifications';

interface StoredNotification {
  _id: string;
  title: string;
  body: string;
  type: string;
}

let lastCheckedId: string | null = null;
let pollingInterval: number | null = null;

export async function startNotificationPolling(checkIntervalMs = 5000): Promise<void> {
  // Initialize audio on first interaction
  await initializeAudio().catch(() => {});

  if (pollingInterval) return;

  pollingInterval = window.setInterval(async () => {
    try {
      const { data } = await api.get('/notifications?pageSize=1&unread=true');
      const latestNotification = data.items?.[0];

      if (latestNotification && latestNotification._id !== lastCheckedId) {
        lastCheckedId = latestNotification._id;
        triggerNotificationAlert(latestNotification);
      }
    } catch (error) {
      // Silently fail if not authenticated
    }
  }, checkIntervalMs);
}

export function stopNotificationPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

async function triggerNotificationAlert(notification: StoredNotification): Promise<void> {
  // Play sound
  try {
    await playNotificationSound();
  } catch (error) {
    // Fallback to beep if sound file not available
    try {
      await playBeep();
    } catch (e) {
      // Silent fail
    }
  }

  // Show desktop notification
  const typeEmojis: Record<string, string> = {
    request_created: '🌿',
    request_confirmed: '✓',
    provider_accepted: '✅',
    provider_proposed: '📅',
    provider_refused: '❌',
    client_accepted: '✓',
    client_refused: '✗',
    request_completed: '✓',
    message: '💬',
  };

  const emoji = typeEmojis[notification.type] || '📬';
  showDesktopNotification(`${emoji} ${notification.title}`, {
    body: notification.body,
    tag: 'gardee-notification',
    requireInteraction: false,
    onClick: () => {
      window.location.href = '/app/notifications';
    },
  });
}
