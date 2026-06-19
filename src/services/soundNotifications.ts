/**
 * Sound notifications using Web Audio API
 */

const NOTIFICATION_SOUND_URL = '/sounds/notification.mp3';

let audioContext: AudioContext | null = null;
let notificationSound: AudioBuffer | null = null;
let soundEnabled = true;

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('notificationSoundEnabled', enabled ? 'true' : 'false');
  }
}

export function isSoundEnabled(): boolean {
  if (typeof localStorage === 'undefined') return soundEnabled;
  const stored = localStorage.getItem('notificationSoundEnabled');
  if (stored !== null) return stored === 'true';
  return soundEnabled;
}

/**
 * Initialize audio context and load notification sound
 */
export async function initializeAudio(): Promise<void> {
  if (audioContext) return;

  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    await loadNotificationSound();
  } catch (error) {
    console.error('Failed to initialize audio context:', error);
  }
}

/**
 * Load notification sound from URL
 */
async function loadNotificationSound(): Promise<void> {
  if (notificationSound || !audioContext) return;

  try {
    const response = await fetch(NOTIFICATION_SOUND_URL);
    const arrayBuffer = await response.arrayBuffer();
    notificationSound = await audioContext!.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.warn('Failed to load notification sound:', error);
  }
}

/**
 * Play notification sound
 */
export async function playNotificationSound(): Promise<void> {
  if (!soundEnabled || !audioContext || !notificationSound) return;

  try {
    // Resume audio context if suspended (some browsers require user interaction)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const source = audioContext.createBufferSource();
    source.buffer = notificationSound;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.3; // 30% volume to avoid being too loud

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start(0);
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
}

/**
 * Alternative: Simple beep using oscillator if no sound file is available
 */
export async function playBeep(frequency = 800, duration = 200): Promise<void> {
  if (!soundEnabled || !audioContext) return;

  try {
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (error) {
    console.error('Failed to play beep:', error);
  }
}
