import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import RatingStars from '../components/vue/RatingStars.vue';

describe('RatingStars', () => {
  it('renders 5 star buttons', () => {
    const wrapper = mount(RatingStars, { props: { modelValue: 0 } });
    expect(wrapper.findAll('.star')).toHaveLength(5);
  });

  it('marks stars active up to modelValue', () => {
    const wrapper = mount(RatingStars, { props: { modelValue: 3 } });
    const stars = wrapper.findAll('.star');
    expect(stars[0].classes()).toContain('active');
    expect(stars[1].classes()).toContain('active');
    expect(stars[2].classes()).toContain('active');
    expect(stars[3].classes()).not.toContain('active');
    expect(stars[4].classes()).not.toContain('active');
  });

  it('emits update:modelValue with star index on click', async () => {
    const wrapper = mount(RatingStars, { props: { modelValue: 0 } });
    await wrapper.findAll('.star')[2].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([[3]]);
  });

  it('highlights stars on hover', async () => {
    const wrapper = mount(RatingStars, { props: { modelValue: 0 } });
    await wrapper.findAll('.star')[3].trigger('mouseenter');
    const stars = wrapper.findAll('.star');
    expect(stars[0].classes()).toContain('active');
    expect(stars[3].classes()).toContain('active');
    expect(stars[4].classes()).not.toContain('active');
  });

  it('clears hover on mouseleave', async () => {
    const wrapper = mount(RatingStars, { props: { modelValue: 1 } });
    const star = wrapper.findAll('.star')[3];
    await star.trigger('mouseenter');
    await star.trigger('mouseleave');
    // only star 1 should be active (modelValue=1)
    expect(wrapper.findAll('.star')[1].classes()).not.toContain('active');
    expect(wrapper.findAll('.star')[0].classes()).toContain('active');
  });

  it('does not emit on click when readonly', async () => {
    const wrapper = mount(RatingStars, { props: { modelValue: 2, readonly: true } });
    await wrapper.findAll('.star')[4].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
  });

  it('does not change hover when readonly', async () => {
    const wrapper = mount(RatingStars, { props: { modelValue: 2, readonly: true } });
    await wrapper.findAll('.star')[4].trigger('mouseenter');
    // only first 2 should be active (modelValue=2, hover not applied)
    expect(wrapper.findAll('.star')[4].classes()).not.toContain('active');
  });

  it('applies readonly class to container when readonly', () => {
    const wrapper = mount(RatingStars, { props: { modelValue: 0, readonly: true } });
    expect(wrapper.find('.stars').classes()).toContain('readonly');
  });
});
