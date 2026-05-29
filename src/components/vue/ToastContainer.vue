<script setup lang="ts">
import { useToastStore } from '../../stores/toast';
const toast = useToastStore();
</script>

<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="toast-slide" tag="div" class="toast-list">
        <div
          v-for="t in toast.toasts"
          :key="t.id"
          :class="['toast', `toast--${t.type}`]"
          role="alert"
          @click="toast.dismiss(t.id)"
        >
          <svg v-if="t.type === 'success'" class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
          <svg v-else-if="t.type === 'error'" class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <svg v-else class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span class="toast-msg">{{ t.message }}</span>
          <button class="toast-close" @click.stop="toast.dismiss(t.id)" aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  pointer-events: none;
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-end;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 1rem;
  border-radius: 12px;
  max-width: 360px;
  min-width: 240px;
  background: #FCFAF5;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
  cursor: pointer;
  pointer-events: auto;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.4;
  font-family: inherit;
  user-select: none;
  border: 1px solid #e5e2d3;
}

.toast--success { border-left: 4px solid #515F37; }
.toast--success .toast-icon { color: #515F37; }

.toast--error { border-left: 4px solid #dc2626; }
.toast--error .toast-icon { color: #dc2626; }

.toast--info { border-left: 4px solid #3b82f6; }
.toast--info .toast-icon { color: #3b82f6; }

.toast-icon { width: 18px; height: 18px; flex-shrink: 0; }
.toast-msg { flex: 1; color: #1a1a0e; }

.toast-close {
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  background: none; border: none; cursor: pointer;
  color: #9ca3af; padding: 0; flex-shrink: 0;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}
.toast-close:hover { color: #374151; background: #f0ede3; }
.toast-close svg { width: 13px; height: 13px; }

.toast-slide-enter-active { transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.toast-slide-leave-active { transition: all 0.18s ease; }
.toast-slide-enter-from { opacity: 0; transform: translateX(48px) scale(0.96); }
.toast-slide-leave-to { opacity: 0; transform: translateX(48px); }
.toast-slide-move { transition: transform 0.2s ease; }

@media (max-width: 480px) {
  .toast-container { left: 1rem; right: 1rem; bottom: 5rem; }
  .toast { max-width: 100%; min-width: unset; width: 100%; }
}
</style>
