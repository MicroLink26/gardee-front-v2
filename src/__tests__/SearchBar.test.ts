import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import SearchBar from '../components/vue/SearchBar.vue';

describe('SearchBar', () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('renders a search input and submit button', () => {
    const wrapper = mount(SearchBar);
    expect(wrapper.find('input[type="search"]').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });

  it('navigates to /recherche?q=... on submit with non-empty query', async () => {
    const wrapper = mount(SearchBar);
    await wrapper.find('input').setValue('jardinage');
    await wrapper.find('form').trigger('submit');
    expect(window.location.href).toBe('/recherche?q=jardinage');
  });

  it('encodes special characters in the query', async () => {
    const wrapper = mount(SearchBar);
    await wrapper.find('input').setValue('taille & élagage');
    await wrapper.find('form').trigger('submit');
    expect(window.location.href).toContain('q=taille');
  });

  it('does not navigate when query is empty', async () => {
    const wrapper = mount(SearchBar);
    await wrapper.find('form').trigger('submit');
    expect(window.location.href).toBe('');
  });

  it('does not navigate when query is only whitespace', async () => {
    const wrapper = mount(SearchBar);
    await wrapper.find('input').setValue('   ');
    await wrapper.find('form').trigger('submit');
    expect(window.location.href).toBe('');
  });
});
