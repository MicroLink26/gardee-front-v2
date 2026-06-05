/**
 * Haptic feedback API composable
 * Provides vibration feedback on mobile devices
 * https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API
 */

export function useHaptics() {
  /**
   * Check if device supports haptic feedback
   */
  const isSupported = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    return 'vibrate' in navigator;
  };

  /**
   * Trigger basic tap feedback (short vibration)
   */
  const tap = () => {
    if (isSupported()) {
      navigator.vibrate(10);
    }
  };

  /**
   * Trigger success feedback (double tap)
   */
  const success = () => {
    if (isSupported()) {
      navigator.vibrate([20, 30, 20]);
    }
  };

  /**
   * Trigger error/warning feedback
   */
  const error = () => {
    if (isSupported()) {
      navigator.vibrate([40, 40, 40]);
    }
  };

  /**
   * Trigger notification feedback
   */
  const notification = () => {
    if (isSupported()) {
      navigator.vibrate([50, 20, 50, 20, 50]);
    }
  };

  /**
   * Heavy feedback for important actions
   */
  const heavy = () => {
    if (isSupported()) {
      navigator.vibrate(100);
    }
  };

  /**
   * Light feedback
   */
  const light = () => {
    if (isSupported()) {
      navigator.vibrate(5);
    }
  };

  /**
   * Custom vibration pattern
   * @param pattern Array of vibration durations in ms
   */
  const custom = (pattern: number[]) => {
    if (isSupported()) {
      navigator.vibrate(pattern);
    }
  };

  /**
   * Stop all vibrations
   */
  const stop = () => {
    if (isSupported()) {
      navigator.vibrate(0);
    }
  };

  return {
    isSupported,
    tap,
    success,
    error,
    notification,
    heavy,
    light,
    custom,
    stop,
  };
}

/**
 * Composable that automatically provides haptic feedback on user actions
 */
export function useAutoHaptics() {
  const haptics = useHaptics();

  const withFeedback = async <T>(
    callback: () => Promise<T> | T,
    feedbackType: 'tap' | 'success' | 'error' = 'tap'
  ): Promise<T> => {
    try {
      haptics[feedbackType]();
      const result = await Promise.resolve(callback());
      return result;
    } catch (error) {
      haptics.error();
      throw error;
    }
  };

  return {
    withFeedback,
    ...haptics,
  };
}
