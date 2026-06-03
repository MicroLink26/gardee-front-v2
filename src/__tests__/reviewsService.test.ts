import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApiGet, mockApiPost } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
}));

vi.mock('../services/api', () => ({
  api: { get: mockApiGet, post: mockApiPost },
  setAccessToken: vi.fn(),
}));

import * as reviewsService from '../services/reviews';

describe('reviews service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validateToken calls GET /reviews/validate with token param', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { valid: true, prestataireName: 'Jean' } });

    const result = await reviewsService.validateToken('review-tok');

    expect(mockApiGet).toHaveBeenCalledWith('/reviews/validate', { params: { token: 'review-tok' } });
    expect(result).toEqual({ valid: true, prestataireName: 'Jean' });
  });

  it('submitReview calls POST /reviews/submit with payload', async () => {
    mockApiPost.mockResolvedValueOnce({});
    const payload = { token: 'tok', ratings: { quality: 5, time: 4 } as any, recommend: true, comment: 'Super !' };

    await reviewsService.submitReview(payload);

    expect(mockApiPost).toHaveBeenCalledWith('/reviews/submit', payload);
  });
});
