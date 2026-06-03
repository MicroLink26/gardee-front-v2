import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApiGet, mockApiPost } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
}));

vi.mock('../services/api', () => ({
  api: { get: mockApiGet, post: mockApiPost },
  setAccessToken: vi.fn(),
}));

import * as authService from '../services/auth';

describe('auth service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('login calls POST /auth/login and returns user + token', async () => {
    const payload = { user: { id: '1', prenom: 'Jean' }, accessToken: 'tok' };
    mockApiPost.mockResolvedValueOnce({ data: payload });

    const result = await authService.login('u@example.com', 'pass');

    expect(mockApiPost).toHaveBeenCalledWith('/auth/login', { email: 'u@example.com', password: 'pass' });
    expect(result).toEqual(payload);
  });

  it('logout calls POST /auth/logout', async () => {
    mockApiPost.mockResolvedValueOnce({});

    await authService.logout();

    expect(mockApiPost).toHaveBeenCalledWith('/auth/logout');
  });

  it('refresh calls POST /auth/refresh and returns accessToken', async () => {
    mockApiPost.mockResolvedValueOnce({ data: { accessToken: 'new-tok' } });

    const token = await authService.refresh();

    expect(token).toBe('new-tok');
  });

  it('getMe calls GET /auth/me and returns user', async () => {
    const user = { id: '1', prenom: 'Jean', email: 'u@example.com' };
    mockApiGet.mockResolvedValueOnce({ data: { user } });

    const result = await authService.getMe();

    expect(result).toEqual(user);
  });

  it('getRoles calls GET /auth/roles and returns role data', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { role: 'user', isPrestataire: false } });

    const result = await authService.getRoles();

    expect(result).toEqual({ role: 'user', isPrestataire: false });
  });

  it('forgotPassword calls POST /auth/forgot-password', async () => {
    mockApiPost.mockResolvedValueOnce({});

    await authService.forgotPassword('u@example.com');

    expect(mockApiPost).toHaveBeenCalledWith('/auth/forgot-password', { email: 'u@example.com' });
  });

  it('resetPassword calls POST /auth/reset-password', async () => {
    mockApiPost.mockResolvedValueOnce({});

    await authService.resetPassword('reset-tok', 'newpass');

    expect(mockApiPost).toHaveBeenCalledWith('/auth/reset-password', { token: 'reset-tok', password: 'newpass' });
  });

  it('checkEmail calls GET /auth/check-email and returns exists', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { exists: true } });

    const result = await authService.checkEmail('taken@example.com');

    expect(mockApiGet).toHaveBeenCalledWith('/auth/check-email', { params: { email: 'taken@example.com' } });
    expect(result).toEqual({ exists: true });
  });

  it('register calls POST /auth/register and returns user + token', async () => {
    const payload = { user: { id: '2' }, accessToken: 'new-tok' };
    mockApiPost.mockResolvedValueOnce({ data: payload });

    const result = await authService.register('u@b.com', 'pass', 'Dupont', 'Jean');

    expect(mockApiPost).toHaveBeenCalledWith('/auth/register', { email: 'u@b.com', password: 'pass', nom: 'Dupont', prenom: 'Jean' });
    expect(result).toEqual(payload);
  });
});
