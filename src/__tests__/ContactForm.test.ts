import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ContactForm from '../components/vue/ContactForm.vue';

const { mockApiPost } = vi.hoisted(() => ({ mockApiPost: vi.fn() }));

vi.mock('../services/api', () => ({
  api: { post: mockApiPost },
  setAccessToken: vi.fn(),
}));

describe('ContactForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  function mountForm() {
    return mount(ContactForm, { global: { plugins: [createPinia()] } });
  }

  it('shows validation error when required fields are empty', async () => {
    const wrapper = mountForm();
    await wrapper.find('button.btn-submit').trigger('click');
    expect(wrapper.find('.form-error').exists()).toBe(true);
    expect(wrapper.find('.form-error').text()).toContain('obligatoires');
  });

  it('shows success state after successful submit', async () => {
    mockApiPost.mockResolvedValueOnce({});
    const wrapper = mountForm();

    await wrapper.find('input[type="text"]').setValue('Jean');
    await wrapper.find('input[type="email"]').setValue('jean@test.fr');
    await wrapper.find('textarea').setValue('Mon message');
    await wrapper.find('button.btn-submit').trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.success').exists()).toBe(true);
    expect(wrapper.find('.success h2').text()).toBe('Message envoyé !');
  });

  it('shows error message when API fails', async () => {
    mockApiPost.mockRejectedValueOnce(new Error('Network error'));
    const wrapper = mountForm();

    await wrapper.find('input[type="text"]').setValue('Jean');
    await wrapper.find('input[type="email"]').setValue('jean@test.fr');
    await wrapper.find('textarea').setValue('Mon message');
    await wrapper.find('button.btn-submit').trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.form-error').exists()).toBe(true);
    expect(wrapper.find('.form-error').text()).toContain('erreur');
  });

  it('toggles subject chip on click', async () => {
    const wrapper = mountForm();
    const chips = wrapper.findAll('.subject-chip');
    expect(chips.length).toBe(4);

    await chips[0].trigger('click');
    expect(chips[0].classes()).toContain('active');

    await chips[0].trigger('click');
    expect(chips[0].classes()).not.toContain('active');
  });

  it('resets form when clicking send another message button', async () => {
    mockApiPost.mockResolvedValueOnce({});
    const wrapper = mountForm();

    await wrapper.find('input[type="text"]').setValue('Jean');
    await wrapper.find('input[type="email"]').setValue('jean@test.fr');
    await wrapper.find('textarea').setValue('Mon message');
    await wrapper.find('button.btn-submit').trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.success').exists()).toBe(true);

    await wrapper.find('.btn-reset').trigger('click');
    expect(wrapper.find('.success').exists()).toBe(false);
    expect(wrapper.find('.form-title').exists()).toBe(true);
  });
});
