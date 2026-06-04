import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

export interface WebVitalsMetrics {
  CLS: number;
  FID?: number;
  FCP: number;
  LCP: number;
  TTFB: number;
}

const vitalsData: Partial<WebVitalsMetrics> = {};

export function trackWebVitals() {
  onCLS((metric) => {
    vitalsData.CLS = metric.value;
    logVital('CLS', metric.value);
  });

  onINP((metric) => {
    logVital('INP', metric.value);
  });

  onFCP((metric) => {
    vitalsData.FCP = metric.value;
    logVital('FCP', metric.value);
  });

  onLCP((metric) => {
    vitalsData.LCP = metric.value;
    logVital('LCP', metric.value);
  });

  onTTFB((metric) => {
    vitalsData.TTFB = metric.value;
    logVital('TTFB', metric.value);
  });

  return vitalsData;
}

function logVital(name: string, value: number) {
  const normalized = name === 'CLS' ? value.toFixed(3) : `${value.toFixed(0)}ms`;
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${name}: ${normalized}`);
  }

  // Store in localStorage for later analysis
  try {
    const stored = JSON.parse(localStorage.getItem('gardee-vitals') || '{}');
    stored[name] = value;
    localStorage.setItem('gardee-vitals', JSON.stringify(stored));
  } catch (e) {
    // Silently fail if localStorage is not available
  }
}

export function getStoredVitals(): Partial<WebVitalsMetrics> | null {
  try {
    const stored = localStorage.getItem('gardee-vitals');
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
}

export function clearStoredVitals() {
  try {
    localStorage.removeItem('gardee-vitals');
  } catch (e) {
    // Silently fail
  }
}
