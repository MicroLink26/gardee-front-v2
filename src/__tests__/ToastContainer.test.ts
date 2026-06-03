import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ToastContainer from '../components/vue/ToastContainer.vue';
import { useToastStore } from '../stores/toast';

// ToastContainer uses <Teleport to="body"> — query document.body for rendered output

describe('ToastContainer', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  function mountContainer() {
    return mount(ToastContainer, {
      global: { plugins: [pinia] },
      attachTo: document.body,
    });
  }

  it('renders nothing when no toasts', () => {
    mountContainer();
    expect(document.querySelectorAll('.toast')).toHaveLength(0);
  });

  it('renders a toast for each item in the store', async () => {
    const toast = useToastStore();
    toast.show('Hello', 'success');
    toast.show('Error!', 'error');

    const wrapper = mountContainer();
    await wrapper.vm.$nextTick();

    expect(document.querySelectorAll('.toast')).toHaveLength(2);
    wrapper.unmount();
  });

  it('applies correct type class to toast', async () => {
    const toast = useToastStore();
    toast.show('Info message', 'info');

    const wrapper = mountContainer();
    await wrapper.vm.$nextTick();

    expect(document.querySelector('.toast')?.classList).toContain('toast--info');
    wrapper.unmount();
  });

  it('shows the message text', async () => {
    const toast = useToastStore();
    toast.show('Message test');

    const wrapper = mountContainer();
    await wrapper.vm.$nextTick();

    expect(document.querySelector('.toast-msg')?.textContent).toBe('Message test');
    wrapper.unmount();
  });

  it('dismisses toast when clicking the toast body', async () => {
    const toast = useToastStore();
    toast.show('Click me');

    const wrapper = mountContainer();
    await wrapper.vm.$nextTick();

    (document.querySelector('.toast') as HTMLElement)?.click();
    await wrapper.vm.$nextTick();

    expect(toast.toasts).toHaveLength(0);
    wrapper.unmount();
  });

  it('dismisses toast when clicking the close button', async () => {
    const toast = useToastStore();
    toast.show('Close me');

    const wrapper = mountContainer();
    await wrapper.vm.$nextTick();

    (document.querySelector('.toast-close') as HTMLElement)?.click();
    await wrapper.vm.$nextTick();

    expect(toast.toasts).toHaveLength(0);
    wrapper.unmount();
  });
});
