/**
 * Utility composable for subtle micro-interactions
 * Improves UX without being distracting
 */

/**
 * Add subtle pulse animation to an element on success
 */
export function pulseElement(element: HTMLElement, duration: number = 300) {
  const originalBackground = element.style.background;

  element.style.transition = `background-color ${duration}ms ease`;
  element.style.background = 'rgba(34, 197, 94, 0.1)';

  setTimeout(() => {
    element.style.background = originalBackground;
    element.style.transition = '';
  }, duration);
}

/**
 * Shake animation for error states
 */
export function shakeElement(element: HTMLElement, duration: number = 400) {
  const originalTransform = element.style.transform;
  const keyframes = [
    { transform: 'translateX(0)' },
    { transform: 'translateX(-10px)' },
    { transform: 'translateX(10px)' },
    { transform: 'translateX(-10px)' },
    { transform: 'translateX(10px)' },
    { transform: 'translateX(0)' },
  ];

  element.animate(keyframes, {
    duration,
    easing: 'ease-in-out',
  });
}

/**
 * Fade in animation
 */
export function fadeIn(element: HTMLElement, duration: number = 300) {
  element.style.opacity = '0';
  element.style.transition = `opacity ${duration}ms ease`;

  // Trigger reflow
  void element.offsetHeight;

  element.style.opacity = '1';

  setTimeout(() => {
    element.style.transition = '';
  }, duration);
}

/**
 * Slide in animation (from bottom)
 */
export function slideUp(element: HTMLElement, duration: number = 300) {
  element.style.opacity = '0';
  element.style.transform = 'translateY(20px)';
  element.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;

  // Trigger reflow
  void element.offsetHeight;

  element.style.opacity = '1';
  element.style.transform = 'translateY(0)';

  setTimeout(() => {
    element.style.transition = '';
    element.style.transform = '';
  }, duration);
}

/**
 * Bounce animation on element
 */
export function bounceElement(element: HTMLElement) {
  const keyframes = [
    { transform: 'scale(1)' },
    { transform: 'scale(1.1)' },
    { transform: 'scale(0.95)' },
    { transform: 'scale(1.05)' },
    { transform: 'scale(1)' },
  ];

  element.animate(keyframes, {
    duration: 500,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  });
}

/**
 * Typewriter effect for text
 */
export function typewriterEffect(
  element: HTMLElement,
  text: string,
  speed: number = 50,
  onComplete?: () => void
) {
  let index = 0;
  element.textContent = '';

  const type = () => {
    if (index < text.length) {
      element.textContent += text[index];
      index++;
      setTimeout(type, speed);
    } else {
      onComplete?.();
    }
  };

  type();
}

/**
 * Copy to clipboard with feedback
 */
export async function copyToClipboard(text: string, element?: HTMLElement) {
  try {
    await navigator.clipboard.writeText(text);

    if (element) {
      const original = element.textContent;
      element.textContent = 'Copié !';
      element.style.color = '#22c55e';

      setTimeout(() => {
        element.textContent = original;
        element.style.color = '';
      }, 2000);
    }

    return true;
  } catch (error) {
    if (element) {
      element.textContent = 'Erreur';
      element.style.color = '#ef4444';

      setTimeout(() => {
        element.textContent = 'Copier';
        element.style.color = '';
      }, 2000);
    }

    return false;
  }
}

/**
 * Ripple effect on click (like Material Design)
 */
export function createRippleEffect(event: MouseEvent, element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const ripple = document.createElement('span');
  ripple.style.position = 'absolute';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.style.width = '20px';
  ripple.style.height = '20px';
  ripple.style.background = 'rgba(255, 255, 255, 0.5)';
  ripple.style.borderRadius = '50%';
  ripple.style.transform = 'scale(0)';
  ripple.style.pointerEvents = 'none';
  ripple.style.animation = 'ripple-animation 0.6s ease-out';

  element.appendChild(ripple);

  setTimeout(() => ripple.remove(), 600);
}
