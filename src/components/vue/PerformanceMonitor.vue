<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getStoredVitals } from '../../services/webVitals';

interface Vital {
  name: string;
  value: number;
  threshold: { good: number; warning: number };
  unit: string;
  status: 'good' | 'warning' | 'poor';
}

const showMonitor = ref(false);
const vitals = ref<Vital[]>([]);
const isDev = import.meta.env.DEV;

function getStatus(value: number, good: number, warning: number): 'good' | 'warning' | 'poor' {
  if (value <= good) return 'good';
  if (value <= warning) return 'warning';
  return 'poor';
}

onMounted(() => {
  if (!isDev) return;

  // Check for stored vitals
  const stored = getStoredVitals();
  if (!stored) return;

  vitals.value = [
    {
      name: 'LCP',
      value: stored.LCP ?? 0,
      threshold: { good: 2500, warning: 4000 },
      unit: 'ms',
      status: getStatus(stored.LCP ?? 0, 2500, 4000),
    },
    {
      name: 'FCP',
      value: stored.FCP ?? 0,
      threshold: { good: 1800, warning: 3000 },
      unit: 'ms',
      status: getStatus(stored.FCP ?? 0, 1800, 3000),
    },
    {
      name: 'CLS',
      value: stored.CLS ?? 0,
      threshold: { good: 0.1, warning: 0.25 },
      unit: '',
      status: getStatus(stored.CLS ?? 0, 0.1, 0.25),
    },
    {
      name: 'TTFB',
      value: stored.TTFB ?? 0,
      threshold: { good: 800, warning: 1800 },
      unit: 'ms',
      status: getStatus(stored.TTFB ?? 0, 800, 1800),
    },
  ];

  // Auto-show if there are poor metrics
  if (vitals.value.some((v) => v.status === 'poor')) {
    showMonitor.value = true;
  }
});

function formatValue(value: number, unit: string): string {
  if (unit === '') {
    return value.toFixed(3);
  }
  if (value > 1000) {
    return `${(value / 1000).toFixed(2)}${unit}`;
  }
  return `${value.toFixed(0)}${unit}`;
}
</script>

<template>
  <div v-if="isDev && vitals.length > 0" class="performance-monitor">
    <button
      v-if="!showMonitor"
      class="monitor-toggle"
      @click="showMonitor = true"
      title="Show Web Vitals"
    >
      ⚡
    </button>

    <div v-else class="monitor-panel">
      <div class="monitor-header">
        <h3>Web Vitals</h3>
        <button class="monitor-close" @click="showMonitor = false">×</button>
      </div>

      <div class="vitals-grid">
        <div v-for="vital in vitals" :key="vital.name" :class="['vital-card', vital.status]">
          <div class="vital-name">{{ vital.name }}</div>
          <div class="vital-value">{{ formatValue(vital.value, vital.unit) }}</div>
          <div class="vital-status">
            <span
              v-if="vital.status === 'good'"
              class="badge good"
              title="Excellent"
            >
              ✓
            </span>
            <span
              v-else-if="vital.status === 'warning'"
              class="badge warning"
              title="Needs improvement"
            >
              ⚠
            </span>
            <span v-else class="badge poor" title="Poor"> ✗ </span>
          </div>
        </div>
      </div>

      <div class="monitor-note">Development only</div>
    </div>
  </div>
</template>

<style scoped>
.performance-monitor {
  position: fixed;
  bottom: 20px;
  right: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  z-index: 9999;
}

.monitor-toggle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #515f37;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(81, 95, 55, 0.3);
  transition: all 0.2s;
}

.monitor-toggle:hover {
  background: #3d4829;
  transform: scale(1.1);
}

.monitor-panel {
  background: white;
  border: 2px solid #515f37;
  border-radius: 12px;
  padding: 16px;
  width: 300px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.monitor-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #1a1a0e;
}

.monitor-close {
  background: none;
  border: none;
  font-size: 20px;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
}

.monitor-close:hover {
  color: #1a1a0e;
}

.vitals-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.vital-card {
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}

.vital-card.good {
  background: #f0fdf4;
  border-color: #86efac;
}

.vital-card.warning {
  background: #fffbeb;
  border-color: #fcd34d;
}

.vital-card.poor {
  background: #fef2f2;
  border-color: #fca5a5;
}

.vital-name {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.vital-value {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a0e;
  margin-bottom: 4px;
}

.vital-status {
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
}

.badge.good {
  background: #dcfce7;
  color: #22c55e;
}

.badge.warning {
  background: #fef3c7;
  color: #f59e0b;
}

.badge.poor {
  background: #fee2e2;
  color: #ef4444;
}

.monitor-note {
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
  font-style: italic;
}
</style>
