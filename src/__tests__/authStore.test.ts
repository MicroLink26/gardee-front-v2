import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const { mockLogin, mockLogout, mockRefresh, mockGetMe, mockSetAccessToken } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockLogout: vi.fn(),
  mockRefresh: vi.fn(),
  mockGetMe: vi.fn(),
  mockSetAccessToken: vi.fn(),
}));

vi.mock('../services/auth', () => ({
  login: mockLogin,
  logout: mockLogout,
  refresh: mockRefresh,
  getMe: mockGetMe,
}));

vi.mock('../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  setAccessToken: mockSetAccessToken,
}));

import { useAuthStore } from '../stores/auth';

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('computed properties', () => {
    it('isLoggedIn is false when no token', () => {
      const store = useAuthStore();
      expect(store.isLoggedIn).toBe(false);
    });

    it('isPrestataire and isStaff are false when user is null', () => {
      const store = useAuthStore();
      expect(store.isPrestataire).toBe(false);
      expect(store.isStaff).toBe(false);
      expect(store.isAdmin).toBe(false);
    });

    it('isLoggedIn is true when token is set', () => {
      const store = useAuthStore();
      store.accessToken = 'tok';
      expect(store.isLoggedIn).toBe(true);
    });

    it('isPrestataire is true when user.isPrestataire is true', () => {
      const store = useAuthStore();
      store.user = { isPrestataire: true } as any;
      expect(store.isPrestataire).toBe(true);
    });

    it('isPrestataire is true for staff role', () => {
      const store = useAuthStore();
      store.user = { role: 'staff', isPrestataire: false } as any;
      expect(store.isPrestataire).toBe(true);
    });

    it('isStaff is true for staff role', () => {
      const store = useAuthStore();
      store.user = { role: 'staff' } as any;
      expect(store.isStaff).toBe(true);
    });

    it('isAdmin is true only for admin role', () => {
      const store = useAuthStore();
      store.user = { role: 'staff' } as any;
      expect(store.isAdmin).toBe(false);
      store.user = { role: 'admin' } as any;
      expect(store.isAdmin).toBe(true);
    });
  });

  describe('login', () => {
    it('sets user, token and calls setAccessToken', async () => {
      const user = { id: '1', prenom: 'Jean' };
      mockLogin.mockResolvedValueOnce({ user, accessToken: 'tok-123' });

      const store = useAuthStore();
      await store.login('u@example.com', 'pass');

      expect(store.user).toEqual(user);
      expect(store.accessToken).toBe('tok-123');
      expect(mockSetAccessToken).toHaveBeenCalledWith('tok-123');
    });
  });

  describe('logout', () => {
    it('clears user and token', async () => {
      mockLogout.mockResolvedValueOnce(undefined);
      const store = useAuthStore();
      store.user = { id: '1' } as any;
      store.accessToken = 'tok';

      await store.logout();

      expect(store.user).toBeNull();
      expect(store.accessToken).toBeNull();
      expect(mockSetAccessToken).toHaveBeenCalledWith(null);
    });

    it('clears state even when logout API fails', async () => {
      mockLogout.mockRejectedValueOnce(new Error('network error'));
      const store = useAuthStore();
      store.accessToken = 'tok';

      await store.logout();

      expect(store.accessToken).toBeNull();
    });
  });

  describe('tryRefresh', () => {
    it('returns true and sets token on success', async () => {
      mockRefresh.mockResolvedValueOnce('new-tok');
      mockGetMe.mockResolvedValueOnce({ id: '1' });
      const store = useAuthStore();

      const result = await store.tryRefresh();

      expect(result).toBe(true);
      expect(store.accessToken).toBe('new-tok');
    });

    it('returns false and clears state on failure', async () => {
      mockRefresh.mockRejectedValueOnce(new Error('expired'));
      const store = useAuthStore();
      store.accessToken = 'old';

      const result = await store.tryRefresh();

      expect(result).toBe(false);
      expect(store.accessToken).toBeNull();
    });
  });

  describe('fetchMe', () => {
    it('does nothing when no accessToken', async () => {
      const store = useAuthStore();
      await store.fetchMe();
      expect(mockGetMe).not.toHaveBeenCalled();
    });

    it('sets user when getMe succeeds', async () => {
      const user = { id: '1', prenom: 'Jean' };
      mockGetMe.mockResolvedValueOnce(user);
      const store = useAuthStore();
      store.accessToken = 'tok';

      await store.fetchMe();

      expect(store.user).toEqual(user);
    });

    it('calls tryRefresh when getMe fails', async () => {
      mockGetMe.mockRejectedValueOnce(new Error('401'));
      mockRefresh.mockRejectedValueOnce(new Error('expired'));
      const store = useAuthStore();
      store.accessToken = 'tok';

      await store.fetchMe();

      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
