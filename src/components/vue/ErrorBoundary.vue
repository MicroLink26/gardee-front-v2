<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';
import { trackError } from '../../services/analytics';

interface ErrorInfo {
  message: string;
  type: string;
  timestamp: number;
}

const isDev = import.meta.env.DEV;
const error = ref<ErrorInfo | null>(null);
const errorCount = ref(0);

onErrorCaptured((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  const errorType = err instanceof Error ? err.name : typeof err;

  error.value = {
    message,
    type: errorType,
    timestamp: Date.now(),
  };

  errorCount.value++;
  trackError(message, errorType);

  // Prevent error from propagating further
  return false;
});

function dismiss() {
  error.value = null;
}

function reload() {
  window.location.reload();
}
</script>

<template>
  <div v-if="error" class="error-boundary">
    <div class="error-container">
      <div class="error-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h2>Oups, quelque chose s'est mal passé</h2>

      <p class="error-message">{{ error.message }}</p>

      <div v-if="isDev" class="error-details">
        <code>{{ error.type }}</code>
        <small>{{ new Date(error.timestamp).toLocaleTimeString() }}</small>
      </div>

      <div v-if="errorCount > 3" class="error-critical">
        <strong>Erreur persistante détectée</strong>
        <p>Il semble y avoir un problème technique. Veuillez actualiser la page ou contacter le support.</p>
      </div>

      <div class="error-actions">
        <button class="btn-secondary" @click="dismiss">Fermer</button>
        <button class="btn-primary" @click="reload">Actualiser la page</button>
      </div>

      <p v-if="!isDev" class="error-support">
        Erreur non résolue ?
        <a href="/contact">Contactez-nous</a>
      </p>
    </div>
  </div>

  <slot />
</template>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #fef2f2 0%, #fdf8f8 100%);
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.error-container {
  background: white;
  border: 2px solid #fca5a5;
  border-radius: 16px;
  padding: 3rem;
  max-width: 480px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(220, 38, 38, 0.1);
}

.error-icon {
  color: #dc2626;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;
}

h2 {
  font-size: 1.5rem;
  color: #1a1a0e;
  margin-bottom: 0.5rem;
  font-weight: 700;
}

.error-message {
  font-size: 0.95rem;
  color: #6b7280;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.error-details {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 1.5rem;
  font-size: 0.75rem;
  overflow-x: auto;
}

.error-details code {
  color: #dc2626;
  font-family: 'Monaco', 'Menlo', monospace;
}

.error-details small {
  display: block;
  color: #9ca3af;
  margin-top: 0.25rem;
}

.error-critical {
  background: #fef2f2;
  border-left: 4px solid #dc2626;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  text-align: left;
}

.error-critical strong {
  display: block;
  color: #dc2626;
  margin-bottom: 0.5rem;
}

.error-critical p {
  font-size: 0.875rem;
  color: #7f1d1d;
  margin: 0;
}

.error-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.btn-primary {
  background: #515F37;
  color: #d6cda4;
}

.btn-primary:hover {
  background: #3d4829;
}

.btn-secondary {
  background: #f3f4f6;
  color: #5a5234;
  border: 1px solid #e5e7eb;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.error-support {
  font-size: 0.85rem;
  color: #9ca3af;
  margin: 0;
}

.error-support a {
  color: #515F37;
  text-decoration: none;
  font-weight: 600;
}

.error-support a:hover {
  text-decoration: underline;
}
</style>
