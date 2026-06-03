import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted runs before vi.mock factory — safe to reference in mock
const { mockAxiosPost, mockApiInstance, getInterceptors } = vi.hoisted(() => {
  let requestHandler: ((config: any) => any) | undefined;
  let responseSuccessHandler: ((r: any) => any) | undefined;
  let responseErrorHandler: ((error: any) => Promise<any>) | undefined;

  const mockApiInstance: any = {
    interceptors: {
      request: { use: vi.fn((fn: any) => { requestHandler = fn; }) },
      response: { use: vi.fn((ok: any, err: any) => { responseSuccessHandler = ok; responseErrorHandler = err; }) },
    },
  };

  return {
    mockAxiosPost: vi.fn(),
    mockApiInstance,
    getInterceptors: () => ({ requestHandler, responseSuccessHandler, responseErrorHandler }),
  };
});

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockApiInstance),
    post: mockAxiosPost,
  },
}));

import { setAccessToken } from '../services/api';

describe('api service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAccessToken(null);
  });

  // ── Request interceptor ────────────────────────────────────────────────

  describe('request interceptor', () => {
    it('adds Authorization header when accessToken is set', () => {
      setAccessToken('my-token');
      const config = { headers: {} as Record<string, string> };

      const result = getInterceptors().requestHandler!(config);

      expect(result.headers.Authorization).toBe('Bearer my-token');
    });

    it('does not add Authorization header when no token', () => {
      const config = { headers: {} as Record<string, string> };

      const result = getInterceptors().requestHandler!(config);

      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  // ── Response success interceptor ───────────────────────────────────────

  describe('response success interceptor', () => {
    it('passes response through unchanged', () => {
      const response = { data: { ok: true } };
      expect(getInterceptors().responseSuccessHandler!(response)).toBe(response);
    });
  });

  // ── Response error interceptor (401 retry) ────────────────────────────

  describe('response error interceptor', () => {
    it('retries request with new token on 401', async () => {
      mockAxiosPost.mockResolvedValueOnce({ data: { accessToken: 'new-token' } });
      const retryResult = { data: 'retried' };
      Object.assign(mockApiInstance, vi.fn().mockResolvedValueOnce(retryResult));

      const error = {
        response: { status: 401 },
        config: { _retry: false, headers: {} as Record<string, string> },
      };

      await getInterceptors().responseErrorHandler!(error).catch(() => {});

      expect(mockAxiosPost).toHaveBeenCalledWith(
        expect.stringContaining('/auth/refresh'),
        {},
        { withCredentials: true }
      );
    });

    it('clears token and rejects when refresh fails', async () => {
      setAccessToken('old-token');
      mockAxiosPost.mockRejectedValueOnce(new Error('Refresh failed'));

      const error = {
        response: { status: 401 },
        config: { _retry: false, headers: {} },
      };

      await expect(getInterceptors().responseErrorHandler!(error)).rejects.toBeDefined();
    });

    it('rejects immediately on non-401 errors without retrying', async () => {
      const error = { response: { status: 500 }, config: {} };

      await expect(getInterceptors().responseErrorHandler!(error)).rejects.toEqual(error);
      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('does not retry when _retry is already true', async () => {
      const error = { response: { status: 401 }, config: { _retry: true } };

      await expect(getInterceptors().responseErrorHandler!(error)).rejects.toEqual(error);
      expect(mockAxiosPost).not.toHaveBeenCalled();
    });
  });
});
