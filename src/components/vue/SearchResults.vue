<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { searchPrestataires } from '../../services/users';
import type { User } from '../../types';
import PrestataireCard from './PrestataireCard.vue';

const props = defineProps<{ initialQuery?: string }>();

const results = ref<User[]>([]);
const total = ref(0);
const page = ref(1);
const query = ref(props.initialQuery ?? '');
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

onMounted(load);
</script>

<template>
  <div class="search-wrapper">
    <!-- Barre de recherche + filtres -->
    <div class="search-top">
      <div class="search-bar-wrap">
        <form class="search-bar" @submit.prevent="search">
          <span class="search-icon">🔍</span>
          <input
            v-model="query"
            type="search"
            placeholder="Service, ville, code postal..."
            class="search-input"
            autofocus
          />
          <button type="submit" class="search-btn">Rechercher</button>
        </form>
      </div>

      <div class="service-chips">
        <button
          v-for="s in SERVICES"
          :key="s"
          class="chip"
          :class="{ active: query === s }"
          @click="selectService(s)"
          type="button"
        >{{ s }}</button>
      </div>
    </div>

    <!-- Résultats -->
    <div class="results-area">
      <!-- Squelettes de chargement -->
      <template v-if="loading">
        <div class="result-meta">
          <div class="skeleton skeleton-text" style="width:160px"></div>
        </div>
        <div class="results-grid">
          <div v-for="i in 6" :key="i" class="skeleton-card">
            <div class="skeleton skeleton-img"></div>
            <div class="skeleton-body">
              <div class="skeleton skeleton-text" style="width:70%"></div>
              <div class="skeleton skeleton-text" style="width:45%"></div>
              <div class="skeleton skeleton-text" style="width:55%"></div>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="result-meta">
          <span class="result-count">
            <strong>{{ total }}</strong> prestataire{{ total > 1 ? 's' : '' }} trouvé{{ total > 1 ? 's' : '' }}
          </span>
          <span v-if="query" class="result-query">pour « {{ query }} »</span>
        </div>

        <!-- Grille -->
        <div v-if="results.length" class="results-grid">
          <PrestataireCard v-for="user in results" :key="user._id" :user="user" />
        </div>

        <!-- Vide -->
        <div v-else class="empty-state">
          <div class="empty-icon">🌿</div>
          <h3>Aucun jardinier trouvé</h3>
          <p>Essayez un autre service ou une autre ville</p>
          <button class="btn-reset" @click="query = ''; search()">Voir tous les jardiniers</button>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination">
          <button class="page-btn" :disabled="page === 1" @click="page--; load()">← Précédent</button>
          <div class="page-nums">
            <button
              v-for="p in totalPages"
              :key="p"
              class="page-num"
              :class="{ active: p === page }"
              @click="page = p; load()"
            >{{ p }}</button>
          </div>
          <button class="page-btn" :disabled="page === totalPages" @click="page++; load()">Suivant →</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.search-wrapper { max-width: 1100px; margin: 0 auto; padding: 2rem; }

/* Barre de recherche */
.search-top { margin-bottom: 2rem; }
.search-bar-wrap { margin-bottom: 1rem; }
.search-bar {
  display: flex;
  align-items: center;
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.35rem 0.35rem 0.35rem 1rem;
  gap: 0.75rem;
  transition: border-color 0.15s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.search-bar:focus-within { border-color: #16a34a; }
.search-icon { font-size: 1.1rem; flex-shrink: 0; }
.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 1rem;
  color: #111827;
  background: transparent;
}
.search-input::placeholder { color: #9ca3af; }
.search-btn {
  padding: 0.6rem 1.5rem;
  background: #16a34a;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.search-btn:hover { background: #15803d; }

/* Chips services */
.service-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.chip {
  padding: 0.4rem 1rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 999px;
  background: #fff;
  color: #374151;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.chip:hover { border-color: #16a34a; color: #16a34a; }
.chip.active { background: #16a34a; border-color: #16a34a; color: #fff; }

/* Meta */
.result-meta { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.25rem; }
.result-count { font-size: 0.9rem; color: #374151; }
.result-count strong { font-weight: 700; }
.result-query { font-size: 0.9rem; color: #6b7280; }

/* Grille */
.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

/* Squelettes */
.skeleton { background: #f3f4f6; border-radius: 6px; animation: pulse 1.5s ease-in-out infinite; }
.skeleton-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; }
.skeleton-img { height: 180px; border-radius: 0; }
.skeleton-body { padding: 1rem; display: flex; flex-direction: column; gap: 0.6rem; }
.skeleton-text { height: 14px; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

/* Vide */
.empty-state { text-align: center; padding: 5rem 2rem; }
.empty-icon { font-size: 3.5rem; margin-bottom: 1rem; }
.empty-state h3 { font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem; }
.empty-state p { color: #6b7280; margin-bottom: 1.5rem; }
.btn-reset { padding: 0.65rem 1.5rem; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }

/* Pagination */
.pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 2.5rem; flex-wrap: wrap; }
.page-btn { padding: 0.5rem 1.1rem; border: 1.5px solid #e5e7eb; border-radius: 8px; background: #fff; color: #374151; font-weight: 500; cursor: pointer; transition: all 0.15s; }
.page-btn:hover:not(:disabled) { border-color: #16a34a; color: #16a34a; }
.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.page-nums { display: flex; gap: 0.35rem; }
.page-num { width: 36px; height: 36px; border: 1.5px solid #e5e7eb; border-radius: 8px; background: #fff; color: #374151; font-weight: 500; cursor: pointer; transition: all 0.15s; }
.page-num:hover { border-color: #16a34a; color: #16a34a; }
.page-num.active { background: #16a34a; border-color: #16a34a; color: #fff; }
</style>
