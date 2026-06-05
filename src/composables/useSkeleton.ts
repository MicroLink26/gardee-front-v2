import { computed } from 'vue';

/**
 * Composable for managing skeleton loader state
 * Shows skeleton while data is loading, then swaps to real content
 */
export function useSkeleton(isLoading: boolean | (() => boolean), delay: number = 0) {
  const showSkeleton = computed(() => {
    const loading = typeof isLoading === 'function' ? isLoading() : isLoading;
    return loading;
  });

  return {
    showSkeleton,
  };
}

/**
 * Generate skeleton count based on viewport
 * Shows more skeletons on larger screens
 */
export function getSkeletonCount(): number {
  if (typeof window === 'undefined') return 3;

  const width = window.innerWidth;

  if (width >= 1280) return 4; // 4K / Large desktop
  if (width >= 1024) return 3; // Desktop
  if (width >= 768) return 2;  // Tablet
  return 1; // Mobile
}

/**
 * Create a range of skeleton items
 */
export function getSkeletonRange(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i);
}
