// Analytics event tracking for user journeys and conversions

interface AnalyticsEvent {
  name: string;
  category: string;
  value?: number | string;
  timestamp: number;
}

const EVENTS_STORAGE_KEY = 'gardee-analytics-events';
const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 30000; // 30 seconds

let eventQueue: AnalyticsEvent[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

function addEvent(name: string, category: string, value?: number | string) {
  const event: AnalyticsEvent = {
    name,
    category,
    value,
    timestamp: Date.now(),
  };

  eventQueue.push(event);

  // Log in dev mode
  if (import.meta.env.DEV) {
    console.log(`[Analytics] ${category}: ${name}`, value ? `(${value})` : '');
  }

  // Flush if batch size reached
  if (eventQueue.length >= BATCH_SIZE) {
    flushEvents();
  } else if (!flushTimeout) {
    // Schedule flush in N seconds
    flushTimeout = setTimeout(flushEvents, FLUSH_INTERVAL);
  }

  // Store locally
  try {
    const stored = localStorage.getItem(EVENTS_STORAGE_KEY) || '[]';
    const events = JSON.parse(stored) as AnalyticsEvent[];
    events.push(event);
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events.slice(-100))); // Keep last 100
  } catch (e) {
    // Silently fail on storage error
  }
}

function flushEvents() {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  if (eventQueue.length === 0) return;

  // In production, send to analytics endpoint
  if (!import.meta.env.DEV) {
    // TODO: Send to analytics service
    // fetch('/api/analytics/events', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(eventQueue),
    // }).catch(() => {});
  }

  eventQueue = [];
}

// User Journey Events
export function trackSearch(query: string, ville?: string) {
  addEvent('search', 'search', `${query}${ville ? ` in ${ville}` : ''}`);
}

export function trackViewProfile(prestataireId: string) {
  addEvent('view_profile', 'engagement', prestataireId);
}

export function trackMapView() {
  addEvent('view_map', 'navigation');
}

export function trackRankingView() {
  addEvent('view_ranking', 'navigation');
}

export function trackServiceFilter(service: string) {
  addEvent('filter_service', 'search', service);
}

// Booking/Contact Events
export function trackBookingAttempt(prestataireId: string) {
  addEvent('booking_attempt', 'conversion', prestataireId);
}

export function trackBookingComplete(prestataireId: string, serviceId: string) {
  addEvent('booking_complete', 'conversion', `${prestataireId}:${serviceId}`);
}

export function trackContactAttempt() {
  addEvent('contact_attempt', 'conversion');
}

export function trackContactComplete() {
  addEvent('contact_complete', 'conversion');
}

// Registration Events
export function trackRegistrationStart(type: 'client' | 'prestataire') {
  addEvent('registration_start', 'conversion', type);
}

export function trackRegistrationStep(step: number) {
  addEvent('registration_step', 'conversion', `step_${step}`);
}

export function trackRegistrationComplete(type: 'client' | 'prestataire') {
  addEvent('registration_complete', 'conversion', type);
}

// Auth Events
export function trackLoginAttempt() {
  addEvent('login_attempt', 'engagement');
}

export function trackLoginComplete() {
  addEvent('login_complete', 'engagement');
}

export function trackLogout() {
  addEvent('logout', 'engagement');
}

// Review Events
export function trackReviewView(prestataireId: string) {
  addEvent('view_reviews', 'engagement', prestataireId);
}

export function trackReviewSubmit(prestataireId: string) {
  addEvent('review_submit', 'conversion', prestataireId);
}

// Error Events
export function trackError(message: string, context?: string) {
  addEvent('error', 'error', `${message}${context ? ` (${context})` : ''}`);
}

export function getStoredEvents(): AnalyticsEvent[] {
  try {
    const stored = localStorage.getItem(EVENTS_STORAGE_KEY) || '[]';
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
}

export function clearStoredEvents() {
  try {
    localStorage.removeItem(EVENTS_STORAGE_KEY);
  } catch (e) {
    // Silently fail
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushEvents);
  window.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      flushEvents();
    }
  });
}
