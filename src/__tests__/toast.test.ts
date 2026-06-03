import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useToastStore } from '../stores/toast';

describe('useToastStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a toast with default type "info"', () => {
    const store = useToastStore();
    store.show('Hello');

    expect(store.toasts).toHaveLength(1);
    expect(store.toasts[0]).toMatchObject({ type: 'info', message: 'Hello' });
  });

  it('adds a toast with specified type', () => {
    const store = useToastStore();
    store.show('Success!', 'success');

    expect(store.toasts[0].type).toBe('success');
  });

  it('adds a toast with error type', () => {
    const store = useToastStore();
    store.show('Oops', 'error');

    expect(store.toasts[0].type).toBe('error');
  });

  it('auto-dismisses after the default duration', () => {
    const store = useToastStore();
    store.show('Auto dismiss');

    expect(store.toasts).toHaveLength(1);
    vi.advanceTimersByTime(3500);
    expect(store.toasts).toHaveLength(0);
  });

  it('auto-dismisses after a custom duration', () => {
    const store = useToastStore();
    store.show('Short', 'info', 1000);

    vi.advanceTimersByTime(999);
    expect(store.toasts).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(store.toasts).toHaveLength(0);
  });

  it('dismiss removes a toast by id', () => {
    const store = useToastStore();
    store.show('First');
    store.show('Second');
    const id = store.toasts[0].id;

    store.dismiss(id);

    expect(store.toasts).toHaveLength(1);
    expect(store.toasts[0].message).toBe('Second');
  });

  it('dismiss does nothing for unknown id', () => {
    const store = useToastStore();
    store.show('Only one');

    store.dismiss(9999);

    expect(store.toasts).toHaveLength(1);
  });

  it('assigns unique ids to each toast', () => {
    const store = useToastStore();
    store.show('First');
    store.show('Second');
    store.show('Third');

    const ids = store.toasts.map(t => t.id);
    expect(new Set(ids).size).toBe(3);
  });
});
