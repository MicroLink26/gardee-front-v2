<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { searchPrestataires } from '../../services/users';
import { useCategoriesStore } from '../../stores/categories';
import type { User } from '../../types';
import PrestataireCard from './PrestataireCard.vue';

const categoriesStore = useCategoriesStore();

const props = defineProps<{ initialQuery?: string }>();

const results = ref<User[]>([]);
const total = ref(0);
const page = ref(1);
const query = ref(props.initialQuery ?? (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('q') ?? '' : ''));
const loading = ref(false);
const PAGE_SIZE = 12;

const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE));

const SERVICES = ['Tonte', 'Taille de haies', 'Élagage', 'Débroussaillage', 'Plantation', 'Arrosage', 'Potager'];

async function load() {
  loading.value = true;
  try {
    const data = await searchPrestataires({ q: query.value || undefined, page: page.value, pageSize: PAGE_SIZE });
    results.value = data.items;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

function search() {
  page.value = 1;
  const url = new URL(window.location.href);
  if (query.value) url.searchParams.set('q', query.value);
  else url.searchParams.delete('q');
  window.history.pushState({}, '', url);
  load();
}

function selectService(s: string) {
  query.value = query.value === s ? '' : s;
  search();
}

function goPage(p: number) {
  page.value = p;
  load();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

onMounted(() => {
  categoriesStore.load();
  load();
});
</script>

<template>
  <div class="search-wrapper">
    <div class="search-top">
      <form class="search-bar" @submit.prevent="search">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input
          v-model="query"
          type="search"
          placeholder="Service, ville, code postal..."
          class="search-input"
          autofocus
        />
        <button type="submit" class="search-btn">Rechercher</button>
      </form>

      <div class="chip-group">
        <button
          v-for="s in SERVICES" :key="s"
          :class="['chip', { active: query === s }]"
          @click="selectService(s)"
          type="button"
        >{{ s }}</button>
      </div>
    </div>

    <div class="results-area">
      <template v-if="loading">
        <div class="results-meta">
          <div class="skeleton" style="width:160px;height:16px;border-radius:6px"></div>
        </div>
        <div class="results-grid">
          <div v-for="i in 6" :key="i" class="skeleton-card">
            <div class="skeleton" style="height:190px"></div>
            <div style="padding:1rem;display:flex;flex-direction:column;gap:0.5rem">
              <div class="skeleton" style="height:14px;width:70%;border-radius:4px"></div>
              <div class="skeleton" style="height:12px;width:45%;border-radius:4px"></div>
              <div class="skeleton" style="height:12px;width:55%;border-radius:4px"></div>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="results-meta">
          <span class="result-count">
            <strong>{{ total }}</strong> prestataire{{ total > 1 ? 's' : '' }}
          </span>
          <span v-if="query" class="result-query">· « {{ query }} »</span>
          <button v-if="query" class="reset-btn" @click="query = ''; search()">Effacer ×</button>
          <a href="/carte" class="map-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
            Voir sur la carte
          </a>
        </div>

        <div v-if="results.length" class="results-grid">
          <PrestataireCard v-for="user in results" :key="user._id" :user="user" />
        </div>

        <div v-else class="empty-state">
          <img src="/arbreUtiliser.png" alt="" style="height:100px;opacity:0.5;margin-bottom:1rem" />
          <h3>Aucun jardinier trouvé</h3>
          <p>Essayez un autre service ou une autre ville</p>
          <button class="btn-primary" @click="query = ''; search()">Voir tous les jardiniers</button>
        </div>

        <div v-if="totalPages > 1" class="pagination">
          <button class="page-btn" :disabled="page === 1" @click="goPage(page - 1)">← Précédent</button>
          <div class="page-nums">
            <button
              v-for="p in totalPages" :key="p"
              :class="['page-num', { active: p === page }]"
              @click="goPage(p)"
            >{{ p }}</button>
          </div>
          <button class="page-btn" :disabled="page === totalPages" @click="goPage(page + 1)">Suivant →</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.search-wrapper { max-width: 1100px; margin: 0 auto; padding: 2rem; }

.search-top { margin-bottom: 2rem; display: flex; flex-direction: column; gap: 0.875rem; }

.search-bar {
  display: flex;
  align-items: center;
  background: #fff;
  border: 2px solid #e5e2d3;
  border-radius: 14px;
  padding: 0.4rem 0.4rem 0.4rem 1rem;
  gap: 0.75rem;
  transition: border-color 0.15s;
  box-shadow: 0 2px 12px rgba(81,95,55,0.06);
}
.search-bar:focus-within { border-color: #515F37; }

.search-icon { width: 18px; height: 18px; color: #9ca3af; flex-shrink: 0; }

.search-input {
  flex: 1; border: none; outline: none;
  font-size: 0.95rem; color: #1a1a0e; background: transparent;
}
.search-input::placeholder { color: #b5ae94; }

.search-btn {
  padding: 0.6rem 1.5rem;
  background: #515F37; color: #fff;
  border: none; border-radius: 10px;
  font-weight: 700; font-size: 0.875rem;
  cursor: pointer; transition: background 0.15s;
  white-space: nowrap;
}
.search-btn:hover { background: #3d4a28; }

.chip-group { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.chip {
  padding: 0.35rem 0.875rem;
  border: 1.5px solid #e5e2d3;
  border-radius: 999px;
  background: #fff; color: #6b7280;
  font-size: 0.82rem; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.chip:hover { border-color: #515F37; color: #515F37; }
.chip.active { background: #515F37; border-color: #515F37; color: #fff; font-weight: 700; }

.results-meta {
  display: flex; align-items: center; gap: 0.625rem;
  margin-bottom: 1.25rem; flex-wrap: wrap;
}
.result-count { font-size: 0.875rem; color: #515F37; font-weight: 500; }
.result-count strong { font-weight: 800; }
.result-query { font-size: 0.875rem; color: #9ca3af; }

.reset-btn {
  font-size: 0.78rem; color: #515F37;
  background: none; border: 1.5px solid #d6cda4;
  border-radius: 999px; padding: 0.2rem 0.7rem;
  cursor: pointer; transition: all 0.15s;
}
.reset-btn:hover { background: #d6cda4; }

.map-link {
  display: flex; align-items: center; gap: 0.3rem;
  margin-left: auto;
  font-size: 0.82rem; font-weight: 600;
  color: #515F37; text-decoration: none;
  padding: 0.3rem 0.75rem;
  border: 1.5px solid #d6cda4; border-radius: 999px;
  transition: all 0.15s;
}
.map-link svg { width: 13px; height: 13px; }
.map-link:hover { background: #d6cda4; }

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

.empty-state { text-align: center; padding: 5rem 2rem; }
.empty-state h3 { font-size: 1.25rem; font-weight: 700; color: #1a1a0e; margin-bottom: 0.5rem; }
.empty-state p { color: #9ca3af; margin-bottom: 1.5rem; }
.btn-primary {
  padding: 0.65rem 1.75rem; background: #515F37; color: #fff;
  border: none; border-radius: 10px; font-weight: 700; cursor: pointer;
  transition: background 0.15s;
}
.btn-primary:hover { background: #3d4a28; }

.pagination {
  display: flex; align-items: center; justify-content: center;
  gap: 1rem; margin-top: 2.5rem; flex-wrap: wrap;
}
.page-btn {
  padding: 0.5rem 1.1rem; border: 1.5px solid #d6cda4; border-radius: 10px;
  background: #fff; color: #515F37; font-weight: 600; font-size: 0.875rem;
  cursor: pointer; transition: all 0.15s;
}
.page-btn:hover:not(:disabled) { background: #d6cda4; }
.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.page-nums { display: flex; gap: 0.35rem; }
.page-num {
  width: 36px; height: 36px; border: 1.5px solid #e5e2d3; border-radius: 8px;
  background: #fff; color: #374151; font-weight: 500; font-size: 0.875rem;
  cursor: pointer; transition: all 0.15s;
}
.page-num:hover { border-color: #515F37; color: #515F37; }
.page-num.active { background: #515F37; border-color: #515F37; color: #fff; }

.skeleton-card { background: #fff; border: 1.5px solid #e5e2d3; border-radius: 16px; overflow: hidden; }
.skeleton {
  background: linear-gradient(90deg, #f3f0e8 25%, #ebe8de 50%, #f3f0e8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

@media (max-width: 600px) {
  .search-wrapper { padding: 1.25rem 1rem; }
  .results-grid { grid-template-columns: 1fr; }
}
</style>
