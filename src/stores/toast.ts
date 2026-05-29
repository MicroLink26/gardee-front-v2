import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

let _nextId = 0;

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([]);

  function show(message: string, type: ToastType = 'info', duration = 3500) {
    const id = ++_nextId;
    toasts.value.push({ id, type, message });
    setTimeout(() => dismiss(id), duration);
  }

  function dismiss(id: number) {
    const idx = toasts.value.findIndex(t => t.id === id);
    if (idx >= 0) toasts.value.splice(idx, 1);
  }

  return { toasts, show, dismiss };
});
