<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../../services/api';

const settings = ref({
  notificationPollingInterval: 600000,
});
const loading = ref(false);

onMounted(async () => {
  await loadSettings();
});

const loadSettings = async () => {
  try {
    const res = await api.get('/settings');
    settings.value = res.data;
  } catch (err) {
    console.error('Error loading settings:', err);
  }
};

const updateSettings = async () => {
  if (settings.value.notificationPollingInterval < 1000 || settings.value.notificationPollingInterval > 3600000) {
    alert('L\'intervalle doit être entre 1000 et 3600000 ms (1 sec à 1 heure)');
    return;
  }

  try {
    loading.value = true;
    await api.patch('/settings', {
      notificationPollingInterval: settings.value.notificationPollingInterval,
    });
    alert('Paramètres mis à jour avec succès!');
  } catch (err) {
    alert('Erreur lors de la mise à jour des paramètres');
    console.error(err);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="admin-settings">
    <div class="page-header">
      <p class="header-eyebrow">Configuration</p>
      <h1>Paramètres d'administration</h1>
      <p class="header-sub">Gérez les paramètres de l'application</p>
    </div>

    <div class="settings-grid">
      <div class="settings-card">
        <h3>⏱️ Intervalle de polling des notifications</h3>
        <p class="card-desc">Temps entre chaque vérification de nouvelles notifications pour les utilisateurs</p>

        <div class="form-group">
          <label for="polling-interval">Intervalle (en millisecondes)</label>
          <input
            id="polling-interval"
            v-model.number="settings.notificationPollingInterval"
            type="number"
            min="1000"
            max="3600000"
            placeholder="600000"
          >
          <p class="form-help">
            Valeur actuelle: <strong>{{ (settings.notificationPollingInterval / 1000).toFixed(0) }} secondes</strong>
            <br>
            Limite: 1 seconde minimum, 1 heure maximum
          </p>
        </div>

        <button @click="updateSettings" :disabled="loading" class="btn-save">
          {{ loading ? '⏳ Sauvegarde en cours...' : '💾 Sauvegarder' }}
        </button>

        <div class="info-box">
          <p>💡 <strong>Info:</strong> Les changements s'appliqueront aux utilisateurs lors de leur prochain rechargement de page.</p>
        </div>
      </div>

      <div class="settings-card coming-soon">
        <h3>🔜 Autres paramètres à venir</h3>
        <p class="card-desc">Plus de paramètres seront ajoutés ici au fil du développement</p>
        <ul>
          <li>Paramètres d'email</li>
          <li>Paramètres de sécurité</li>
          <li>Paramètres de caching</li>
          <li>Paramètres de rate limiting</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-settings {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.header-eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #a8c47a;
  margin: 0 0 0.5rem;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 800;
  color: #1f2937;
  margin: 0 0 0.5rem;
}

.header-sub {
  color: #6b7280;
  margin: 0;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.settings-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 2rem;
}

.settings-card h3 {
  margin: 0 0 0.5rem;
  color: #1f2937;
  font-size: 1.2rem;
}

.card-desc {
  margin: 0 0 1.5rem;
  color: #6b7280;
  font-size: 0.95rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
}

.form-group input:focus {
  outline: none;
  border-color: #a8c47a;
  box-shadow: 0 0 0 3px rgba(168, 196, 122, 0.1);
}

.form-help {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.5rem;
  line-height: 1.5;
}

.btn-save {
  width: 100%;
  padding: 0.875rem;
  background: linear-gradient(135deg, #5f7a39 0%, #515f37 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 1.5rem;
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(95, 122, 57, 0.35);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.info-box {
  background: #f0ede3;
  border: 1px solid #c8d9a6;
  border-radius: 8px;
  padding: 1rem;
  margin: 0;
}

.info-box p {
  margin: 0;
  color: #515f37;
  font-size: 0.9rem;
  line-height: 1.5;
}

.coming-soon {
  background: #f9fafb;
  opacity: 0.7;
}

.coming-soon ul {
  margin: 1rem 0 0;
  padding-left: 1.5rem;
  color: #9ca3af;
  font-size: 0.9rem;
}

.coming-soon li {
  margin-bottom: 0.5rem;
}

@media (max-width: 768px) {
  .admin-settings {
    padding: 1rem;
  }

  .settings-grid {
    grid-template-columns: 1fr;
  }

  .page-header h1 {
    font-size: 1.5rem;
  }
}
</style>
