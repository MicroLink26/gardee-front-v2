import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrestataireCard from '../components/vue/PrestataireCard.vue';
import type { User } from '../types';

vi.mock('../composables/useAvatar', () => ({
  getAvatar: (_id: string, imageUrl?: string) => imageUrl ?? '/img/default-avatar.png',
}));

vi.mock('../composables/useCategoryName', () => ({
  useCategoryName: () => ({
    categoryName: (id: string) => `Cat-${id}`,
  }),
}));

const baseUser: User = {
  _id: 'user-1',
  email: 'j@test.fr',
  nom: 'Dupont',
  prenom: 'Jean',
  role: 'user',
  isPrestataire: true,
  is_validated: true,
  createdAt: '2024-01-01T00:00:00Z',
  prestations: ['cat-1', 'cat-2', 'cat-3', 'cat-4'],
  tarifHoraire: 35,
  ville: 'Lyon',
  averageRating: 4.2,
  numberOfReviews: 8,
};

describe('PrestataireCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders user name and city', () => {
    const wrapper = mount(PrestataireCard, { props: { user: baseUser } });
    expect(wrapper.find('.card-name').text()).toBe('Jean Dupont');
    expect(wrapper.find('.card-ville').text()).toContain('Lyon');
  });

  it('shows price when tarifHoraire is set', () => {
    const wrapper = mount(PrestataireCard, { props: { user: baseUser } });
    expect(wrapper.find('.card-price').exists()).toBe(true);
    expect(wrapper.find('.card-price').text()).toContain('35');
  });

  it('hides price when tarifHoraire is not set', () => {
    const user = { ...baseUser, tarifHoraire: undefined };
    const wrapper = mount(PrestataireCard, { props: { user } });
    expect(wrapper.find('.card-price').exists()).toBe(false);
  });

  it('links to prestataire profile page', () => {
    const wrapper = mount(PrestataireCard, { props: { user: baseUser } });
    expect(wrapper.find('a.card').attributes('href')).toBe('/prestataires/user-1/');
  });

  it('shows rating when numberOfReviews > 0', () => {
    const wrapper = mount(PrestataireCard, { props: { user: baseUser } });
    expect(wrapper.find('.rating-val').text()).toBe('4.2');
    expect(wrapper.find('.rating-count').text()).toContain('8');
    expect(wrapper.find('.new-badge').exists()).toBe(false);
  });

  it('shows "Nouveau" badge when numberOfReviews is 0', () => {
    const user = { ...baseUser, numberOfReviews: 0 };
    const wrapper = mount(PrestataireCard, { props: { user } });
    expect(wrapper.find('.new-badge').exists()).toBe(true);
    expect(wrapper.find('.rating-val').exists()).toBe(false);
  });

  it('shows at most 3 prestation tags', () => {
    const wrapper = mount(PrestataireCard, { props: { user: baseUser } });
    expect(wrapper.findAll('.tag')).toHaveLength(3);
  });

  it('renders custom avatar when profil_image is set', () => {
    const user = { ...baseUser, profil_image: { secure_url: '/custom.jpg', public_id: 'abc' } };
    const wrapper = mount(PrestataireCard, { props: { user } });
    expect(wrapper.find('img').attributes('src')).toBe('/custom.jpg');
  });
});
