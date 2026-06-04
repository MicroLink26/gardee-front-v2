import { onMounted, onUnmounted } from 'vue';

interface KeyboardOptions {
  /**
   * Handler for Escape key
   */
  onEscape?: () => void;

  /**
   * Handler for Enter key
   */
  onEnter?: () => void;

  /**
   * Handler for Arrow Up
   */
  onArrowUp?: () => void;

  /**
   * Handler for Arrow Down
   */
  onArrowDown?: () => void;

  /**
   * Custom key handlers: key name -> handler
   */
  customKeys?: Record<string, () => void>;
}

/**
 * Hook into keyboard events for accessibility
 * Useful for modals, dialogs, menus with keyboard navigation
 */
export function useKeyboard(options: KeyboardOptions) {
  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        if (options.onEscape) {
          options.onEscape();
          event.preventDefault();
        }
        break;

      case 'Enter':
        if (options.onEnter) {
          options.onEnter();
          event.preventDefault();
        }
        break;

      case 'ArrowUp':
        if (options.onArrowUp) {
          options.onArrowUp();
          event.preventDefault();
        }
        break;

      case 'ArrowDown':
        if (options.onArrowDown) {
          options.onArrowDown();
          event.preventDefault();
        }
        break;

      default:
        if (options.customKeys && event.key in options.customKeys) {
          options.customKeys[event.key]();
          event.preventDefault();
        }
    }
  };

  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });
}

/**
 * Detect if user prefers reduced motion (accessibility)
 */
export function usePrefersReducedMotion() {
  const prefersReducedMotion = () => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  return {
    prefersReducedMotion,
  };
}
