import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApiGet, mockApiPost, mockApiPut } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
  mockApiPut: vi.fn(),
}));

vi.mock('../services/api', () => ({
  api: { get: mockApiGet, post: mockApiPost, put: mockApiPut },
  setAccessToken: vi.fn(),
}));

import * as usersService from '../services/users';

describe('users service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('searchPrestataires calls GET /prestataires/search', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { items: [], total: 0 } });

    const result = await usersService.searchPrestataires({ q: 'jardinage', page: 1 });

    expect(mockApiGet).toHaveBeenCalledWith('/prestataires/search', { params: { q: 'jardinage', page: 1 } });
    expect(result).toEqual({ items: [], total: 0 });
  });

  it('getRanking calls GET /prestataires/ranking', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { items: [], total: 0 } });

    await usersService.getRanking({ prestation: 'Tonte', page: 1 });

    expect(mockApiGet).toHaveBeenCalledWith('/prestataires/ranking', { params: { prestation: 'Tonte', page: 1 } });
  });

  it('getPrestataire calls GET /prestataires/:id', async () => {
    const user = { _id: 'pid', nom: 'Dupont' };
    mockApiGet.mockResolvedValueOnce({ data: { user } });

    const result = await usersService.getPrestataire('pid');

    expect(mockApiGet).toHaveBeenCalledWith('/prestataires/pid');
    expect(result).toEqual(user);
  });

  it('getReviews calls GET /prestataires/:id/reviews', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { items: [], total: 0 } });

    await usersService.getReviews('pid', { page: 2, pageSize: 10 });

    expect(mockApiGet).toHaveBeenCalledWith('/prestataires/pid/reviews', { params: { page: 2, pageSize: 10 } });
  });

  it('getMyProfile calls GET /users/me', async () => {
    const user = { _id: 'uid', prenom: 'Jean' };
    mockApiGet.mockResolvedValueOnce({ data: { user } });

    const result = await usersService.getMyProfile();

    expect(result).toEqual(user);
  });

  it('updateMyProfile calls PUT /users/me with FormData', async () => {
    const user = { _id: 'uid', prenom: 'Jean' };
    mockApiPut.mockResolvedValueOnce({ data: { user } });
    const fd = new FormData();

    const result = await usersService.updateMyProfile(fd);

    expect(mockApiPut).toHaveBeenCalledWith('/users/me', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    expect(result).toEqual(user);
  });

  it('registerPrestataire calls POST /prestataires/register', async () => {
    mockApiPost.mockResolvedValueOnce({});
    const fd = new FormData();

    await usersService.registerPrestataire(fd);

    expect(mockApiPost).toHaveBeenCalledWith('/prestataires/register', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  });

  it('registerClient calls POST /users/register/client', async () => {
    mockApiPost.mockResolvedValueOnce({});

    await usersService.registerClient({ email: 'u@b.com', password: 'pass', nom: 'D', prenom: 'J', telephone: '06' });

    expect(mockApiPost).toHaveBeenCalledWith('/users/register/client', expect.objectContaining({ email: 'u@b.com' }));
  });

  it('changePassword calls PUT /auth/change-password', async () => {
    mockApiPut.mockResolvedValueOnce({});

    await usersService.changePassword('old', 'new');

    expect(mockApiPut).toHaveBeenCalledWith('/auth/change-password', { currentPassword: 'old', newPassword: 'new' });
  });
});
