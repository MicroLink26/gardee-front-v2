import { ref, onMounted, onUnmounted } from 'vue';

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

interface SwipeEvent {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  duration: number;
  velocity: number;
}

interface PinchEvent {
  scale: number;
  angle: number;
}

interface GestureHandlers {
  onSwipe?: (event: SwipeEvent) => void;
  onPinch?: (event: PinchEvent) => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
}

/**
 * Mobile gesture recognition composable
 * Handles swipe, pinch, double-tap, and long-press gestures
 */
export function useGestures(element: any, handlers: GestureHandlers) {
  const touchStart = ref<TouchPoint | null>(null);
  const touchEnd = ref<TouchPoint | null>(null);
  const touches = ref<Touch[]>([]);
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let lastTapTime = 0;

  const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchAngle = (touch1: Touch, touch2: Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  const handleTouchStart = (event: TouchEvent) => {
    touches.value = Array.from(event.touches);

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      touchStart.value = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      // Setup long press timer
      longPressTimer = setTimeout(() => {
        if (handlers.onLongPress) {
          handlers.onLongPress();
        }
      }, 500);
    }
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (event.touches.length === 2 && handlers.onPinch) {
      // Handle pinch
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const distance = getTouchDistance(touch1, touch2);
      const lastDistance = getTouchDistance(
        touches.value[0] || touch1,
        touches.value[1] || touch2
      );
      const scale = distance / lastDistance;
      const angle = getTouchAngle(touch1, touch2);

      handlers.onPinch({ scale, angle });
    }

    touches.value = Array.from(event.touches);

    // Clear long press if user moves
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (event.changedTouches.length === 1 && touchStart.value && handlers.onSwipe) {
      const touch = event.changedTouches[0];
      touchEnd.value = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      // Clear long press timer
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      // Calculate swipe
      const dx = touchEnd.value.x - touchStart.value.x;
      const dy = touchEnd.value.y - touchStart.value.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const duration = touchEnd.value.time - touchStart.value.time;
      const velocity = distance / duration;

      // Only trigger if swipe distance > 30px and velocity > 0.1
      if (distance > 30 && velocity > 0.1) {
        let direction: 'left' | 'right' | 'up' | 'down';

        if (Math.abs(dx) > Math.abs(dy)) {
          direction = dx > 0 ? 'right' : 'left';
        } else {
          direction = dy > 0 ? 'down' : 'up';
        }

        handlers.onSwipe({
          direction,
          distance,
          duration,
          velocity,
        });
      }

      // Check for double tap
      const now = Date.now();
      if (now - lastTapTime < 300 && handlers.onDoubleTap) {
        handlers.onDoubleTap();
      }
      lastTapTime = now;
    }

    touchStart.value = null;
    touchEnd.value = null;
  };

  onMounted(() => {
    const el = element?.value || element;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
  });

  onUnmounted(() => {
    const el = element?.value || element;
    if (!el) return;

    el.removeEventListener('touchstart', handleTouchStart);
    el.removeEventListener('touchmove', handleTouchMove);
    el.removeEventListener('touchend', handleTouchEnd);

    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
  });

  return {
    touchStart,
    touchEnd,
  };
}

/**
 * Mobile-friendly scroll behavior
 */
export function useSmoothScroll() {
  const scrollToElement = (element: HTMLElement | null, offset: number = 0) => {
    if (!element) return;

    const top = element.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({
      top,
      behavior: 'smooth',
    });
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return {
    scrollToElement,
    scrollToTop,
  };
}

/**
 * Detect if user is on mobile
 */
export function useIsMobile() {
  const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  };

  return {
    isMobile,
  };
}
