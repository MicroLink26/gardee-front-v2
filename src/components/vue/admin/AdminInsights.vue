<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { api } from '../../../services/api';
import {
  Chart,
  LineController, BarController,
  LineElement, BarElement, PointElement,
  CategoryScale, LinearScale,
  Filler, Tooltip, Legend,
} from 'chart.js';

Chart.register(LineController, BarController, LineElement, BarElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend);

interface KPIs {
  totalUsers: number;
  totalPrestataires: number;
  pendingPrestataires: number;
  totalRequests: number;
  completedRequests: number;
}

interface SeriesPoint { date: string; count: number }

interface InsightsData {
  kpis: KPIs;
  granularity: 'day' | 'week' | 'month';
  series: { users: SeriesPoint[]; requests: SeriesPoint[] };
  requestsByStatus: Record<string, number>;
}

const DAYS_OPTIONS = [
  { label: '7 jours', value: 7 },
  { label: '30 jours', value: 30 },
  { label: '90 jours', value: 90 },
  { label: '1 an', value: 365 },
];

const STATUS_LABELS: Record<string, string> = {
  email_pending: 'Email en attente',
  client_confirmed: 'Confirmé client',
  sent_to_provider: 'Envoyé prest.',
  provider_proposed: 'Proposé prest.',
  provider_accepted: 'Accepté prest.',
  client_accepted: 'Accepté client',
  scheduled: 'Planifié',
  completed: 'Terminé',
  refused: 'Refusé',
  cancelled: 'Annulé',
};

const STATUS_COLORS: Record<string, string> = {
  email_pending: '#d1d5db',
  client_confirmed: '#93c5fd',
  sent_to_provider: '#a5b4fc',
  provider_proposed: '#fcd34d',
  provider_accepted: '#6ee7b7',
  client_accepted: '#34d399',
  scheduled: '#a8c47a',
  completed: '#3a5020',
  refused: '#f87171',
  cancelled: '#9ca3af',
};

const days = ref(30);
const data = ref<InsightsData | null>(null);
const loading = ref(true);

const usersCanvas = ref<HTMLCanvasElement | null>(null);
const requestsCanvas = ref<HTMLCanvasElement | null>(null);
const statusCanvas = ref<HTMLCanvasElement | null>(null);
let usersChart: Chart | null = null;
let requestsChart: Chart | null = null;
let statusChart: Chart | null = null;

async function load() {
  loading.value = true;
  const res = await api.get(`/admin/insights?days=${days.value}`);
  data.value = res.data;
  loading.value = false;
  await nextTick();
  renderCharts();
}

function fillDates(series: SeriesPoint[], gran: 'day' | 'week' | 'month', n: number) {
  const map = Object.fromEntries(series.map(p => [p.date, p.count]));
  const labels: string[] = [];
  const counts: number[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    if (gran === 'day') { d.setDate(d.getDate() - i); const k = d.toISOString().slice(0, 10); labels.push(k.slice(5)); counts.push(map[k] ?? 0); }
    else if (gran === 'week') { d.setDate(d.getDate() - i * 7); const k = `${d.getFullYear()}-${String(getWeek(d)).padStart(2, '0')}`; labels.push(`S${k.slice(5)}`); counts.push(map[k] ?? 0); }
    else { d.setMonth(d.getMonth() - i); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; labels.push(k.slice(5) + '/' + k.slice(0, 4).slice(2)); counts.push(map[k] ?? 0); }
  }
  return { labels, counts };
}

function getWeek(d: Date) {
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
}

function bucketCount(gran: 'day' | 'week' | 'month') {
  if (gran === 'day') return days.value;
  if (gran === 'week') return Math.ceil(days.value / 7);
  return Math.ceil(days.value / 30);
}

function lineDataset(label: string, counts: number[], color: string) {
  return {
    label,
    data: counts,
    borderColor: color,
    backgroundColor: color + '22',
    borderWidth: 2,
    pointRadius: counts.length <= 30 ? 3 : 0,
    pointHoverRadius: 5,
    tension: 0.4,
    fill: true,
  };
}

function renderCharts() {
  if (!data.value) return;
  const d = data.value;
  const n = bucketCount(d.granularity);

  const users = fillDates(d.series.users, d.granularity, n);
  const requests = fillDates(d.series.requests, d.granularity, n);

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index' as const, intersect: false } },
    scales: {
      x: { grid: { color: '#f0ede3' }, ticks: { color: '#9ca3af', font: { size: 11 } } },
      y: { grid: { color: '#f0ede3' }, ticks: { color: '#9ca3af', font: { size: 11 }, precision: 0 }, beginAtZero: true },
    },
  };

  if (usersChart) usersChart.destroy();
  if (usersCanvas.value) {
    usersChart = new Chart(usersCanvas.value, {
      type: 'line',
      data: { labels: users.labels, datasets: [lineDataset('Inscriptions', users.counts, '#3a5020')] },
      options: commonOptions,
    });
  }

  if (requestsChart) requestsChart.destroy();
  if (requestsCanvas.value) {
    requestsChart = new Chart(requestsCanvas.value, {
      type: 'line',
      data: { labels: requests.labels, datasets: [lineDataset('Demandes', requests.counts, '#a8c47a')] },
      options: commonOptions,
    });
  }

  if (statusChart) statusChart.destroy();
  if (statusCanvas.value) {
    const statuses = Object.keys(d.requestsByStatus);
    statusChart = new Chart(statusCanvas.value, {
      type: 'bar',
      data: {
        labels: statuses.map(s => STATUS_LABELS[s] ?? s),
        datasets: [{
          data: statuses.map(s => d.requestsByStatus[s]),
          backgroundColor: statuses.map(s => STATUS_COLORS[s] ?? '#e9e5d6'),
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
          y: { grid: { color: '#f0ede3' }, ticks: { color: '#9ca3af', font: { size: 11 }, precision: 0 }, beginAtZero: true },
        },
      },
    });
  }
}

const conversionRate = computed(() => {
  if (!data.value || !data.value.kpis.totalRequests) return '—';
  return ((data.value.kpis.completedRequests / data.value.kpis.totalRequests) * 100).toFixed(1) + '%';
});

watch(days, load);
onMounted(load);
</script>

<template>
  <div class="insights">
    <div class="page-header">
      <div>
        <p class="header-eyebrow">Administration</p>
        <h1>Insights</h1>
        <p class="header-sub">Statistiques de la plateforme Gardee</p>
      </div>
      <div class="period-selector">
        <button
          v-for="opt in DAYS_OPTIONS"
          :key="opt.value"
          :class="['period-btn', { active: days === opt.value }]"
          @click="days = opt.value"
        >{{ opt.label }}</button>
      </div>
    </div>

    <div v-if="loading" class="skeleton-grid">
      <div v-for="i in 5" :key="i" class="skeleton" style="height:100px;border-radius:16px"></div>
    </div>

    <template v-else-if="data">
      <!-- KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
          <div class="kpi-body">
            <div class="kpi-value">{{ data.kpis.totalUsers }}</div>
            <div class="kpi-label">Utilisateurs inscrits</div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon kpi-icon--leaf">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12c0-2.76 1.12-5.26 2.93-7.07"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div class="kpi-body">
            <div class="kpi-value">{{ data.kpis.totalPrestataires }}</div>
            <div class="kpi-label">Prestataires validés</div>
          </div>
        </div>

        <div class="kpi-card" :class="{ 'kpi-card--alert': data.kpis.pendingPrestataires > 0 }">
          <div class="kpi-icon kpi-icon--orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="kpi-body">
            <div class="kpi-value">{{ data.kpis.pendingPrestataires }}</div>
            <div class="kpi-label">En attente de validation</div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon kpi-icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div class="kpi-body">
            <div class="kpi-value">{{ data.kpis.totalRequests }}</div>
            <div class="kpi-label">Demandes totales</div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon kpi-icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="kpi-body">
            <div class="kpi-value">{{ data.kpis.completedRequests }}</div>
            <div class="kpi-label">Missions terminées <span class="kpi-rate">{{ conversionRate }}</span></div>
          </div>
        </div>
      </div>

      <!-- Graphes linéaires -->
      <div class="charts-row">
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">Inscriptions</div>
            <div class="chart-subtitle">Nouveaux utilisateurs sur la période</div>
          </div>
          <div class="chart-area">
            <canvas ref="usersCanvas"></canvas>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">Demandes</div>
            <div class="chart-subtitle">Nouvelles demandes sur la période</div>
          </div>
          <div class="chart-area">
            <canvas ref="requestsCanvas"></canvas>
          </div>
        </div>
      </div>

      <!-- Répartition statuts -->
      <div class="chart-card chart-card--full">
        <div class="chart-header">
          <div class="chart-title">Répartition des demandes par statut</div>
          <div class="chart-subtitle">Toutes périodes confondues</div>
        </div>
        <div class="chart-area chart-area--tall">
          <canvas ref="statusCanvas"></canvas>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.insights { display: flex; flex-direction: column; gap: 1.5rem; }

.page-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding-bottom: 1.5rem; border-bottom: 1px solid #e9e5d6;
  flex-wrap: wrap; gap: 1rem;
}
.header-eyebrow { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #a8c47a; margin: 0 0 0.35rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 900; color: #1a1a0e; margin: 0 0 0.2rem; letter-spacing: -0.02em; }
.header-sub { font-size: 0.85rem; color: #9ca3af; margin: 0; }

.period-selector { display: flex; gap: 0.35rem; background: #f0ede3; padding: 0.3rem; border-radius: 10px; }
.period-btn {
  padding: 0.35rem 0.875rem; border: none; border-radius: 7px;
  font-size: 0.8rem; font-weight: 600; font-family: inherit;
  cursor: pointer; background: transparent; color: #6b7280;
  transition: all 0.15s;
}
.period-btn:hover { color: #3a5020; }
.period-btn.active { background: #fff; color: #3a5020; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

.skeleton-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.75rem; }
.skeleton {
  background: linear-gradient(90deg, #f3f0e8 25%, #ebe8de 50%, #f3f0e8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.875rem; }

.kpi-card {
  display: flex; align-items: center; gap: 0.875rem;
  background: #FCFAF5; border: 1.5px solid #e9e5d6; border-radius: 16px; padding: 1.125rem;
  transition: box-shadow 0.15s;
}
.kpi-card:hover { box-shadow: 0 4px 16px rgba(58,80,32,0.07); }
.kpi-card--alert { border-color: rgba(230,197,83,0.5); background: rgba(230,197,83,0.04); }

.kpi-icon {
  width: 44px; height: 44px; border-radius: 11px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.kpi-icon svg { width: 20px; height: 20px; }
.kpi-icon--green { background: #eef2e8; color: #3a5020; }
.kpi-icon--leaf { background: #dcfce7; color: #166534; }
.kpi-icon--orange { background: rgba(230,197,83,0.18); color: #92400e; }
.kpi-icon--blue { background: #eff6ff; color: #1d4ed8; }

.kpi-body { flex: 1; min-width: 0; }
.kpi-value { font-size: 1.75rem; font-weight: 900; color: #1a1a0e; line-height: 1; }
.kpi-label { font-size: 0.775rem; color: #9ca3af; margin-top: 0.2rem; }
.kpi-rate { color: #3a5020; font-weight: 700; margin-left: 0.35rem; }

.charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (max-width: 700px) { .charts-row { grid-template-columns: 1fr; } }

.chart-card {
  background: #FCFAF5; border: 1.5px solid #e9e5d6; border-radius: 16px; padding: 1.25rem;
}
.chart-card--full { width: 100%; }

.chart-header { margin-bottom: 1rem; }
.chart-title { font-size: 0.9rem; font-weight: 800; color: #1a1a0e; }
.chart-subtitle { font-size: 0.775rem; color: #9ca3af; margin-top: 0.1rem; }

.chart-area { position: relative; height: 220px; }
.chart-area--tall { height: 260px; }
</style>
