import { ref, onMounted, onUnmounted } from 'vue';

/**
 * Trap focus within a modal/dialog element
 * Prevents tabbing out of the modal
 */
export function useFocusTrap(containerRef: any) {
  const isActive = ref(false);

  const getFocusableElements = (container: HTMLElement) => {
    return container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const container = containerRef.value;
    if (!container) return;

    const focusableElements = Array.from(getFocusableElements(container));
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        lastElement?.focus();
        event.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        firstElement?.focus();
        event.preventDefault();
      }
    }
  };

  const activate = () => {
    if (isActive.value) return;
    isActive.value = true;
    document.addEventListener('keydown', handleKeyDown);

    // Focus first element
    const container = containerRef.value;
    if (container) {
      const focusableElements = getFocusableElements(container);
      const firstElement = focusableElements[0] as HTMLElement;
      firstElement?.focus();
    }
  };

  const deactivate = () => {
    if (!isActive.value) return;
    isActive.value = false;
    document.removeEventListener('keydown', handleKeyDown);
  };

  onUnmounted(() => {
    deactivate();
  });

  return {
    activate,
    deactivate,
    isActive,
  };
}

/**
 * Manage focus restoration when closing a modal
 */
export function useFocusRestore() {
  let previouslyFocusedElement: HTMLElement | null = null;

  const saveFocus = () => {
    previouslyFocusedElement = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
      previouslyFocusedElement.focus();
    }
  };

  return {
    saveFocus,
    restoreFocus,
  };
}
