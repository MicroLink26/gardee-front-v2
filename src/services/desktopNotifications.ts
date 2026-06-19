/**
 * Desktop notifications using Notification API
 */

export function isDesktopNotificationSupported(): boolean {
  return 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isDesktopNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isDesktopNotificationSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}

export function showDesktopNotification(
  title: string,
  options?: NotificationOptions & { onClose?: () => void; onClick?: () => void }
): Notification | null {
  if (!isDesktopNotificationSupported()) return null;
  if (Notification.permission !== 'granted') return null;

  const { onClose, onClick, ...notificationOptions } = options || {};

  try {
    const notification = new Notification(title, {
      icon: '/img/logo.png',
      badge: '/img/logo.png',
      ...notificationOptions,
    });

    if (onClick) {
      notification.addEventListener('click', () => {
        onClick();
        notification.close();
      });
    }

    if (onClose) {
      notification.addEventListener('close', onClose);
    }

    return notification;
  } catch (error) {
    console.error('Failed to show desktop notification:', error);
    return null;
  }
}

export function closeAllNotifications(): void {
  if (!isDesktopNotificationSupported()) return;
  // Browser API doesn't provide a way to close all notifications
  // This would need to track them manually if needed
}
