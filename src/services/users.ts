import { api } from './api';
import type { User, PaginatedResult } from '../types';

export async function searchPrestataires(params: {
  q?: string; page?: number; pageSize?: number;
  sort?: 'rating' | 'price_asc' | 'distance';
  lat?: number; lng?: number;
}): Promise<PaginatedResult<User>> {
  const { data } = await api.get('/users/search', { params });
  return data;
}

export async function getRanking(params: {
  prestation?: string; ville?: string; page?: number; pageSize?: number;
}): Promise<PaginatedResult<User>> {
  const { data } = await api.get('/users/ranking', { params });
  return data;
}

export async function getPrestataire(id: string): Promise<User> {
  const { data } = await api.get(`/users/${id}`);
  return data.user;
}

export async function getReviews(id: string, params: { page?: number; pageSize?: number }) {
  const { data } = await api.get(`/users/${id}/reviews`, { params });
  return data;
}

export async function getMyProfile(): Promise<User> {
  const { data } = await api.get('/users/me');
  return data.user;
}

export async function updateMyProfile(formData: FormData): Promise<User> {
  const { data } = await api.put('/users/me', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.user;
}

export async function registerPrestataire(formData: FormData): Promise<void> {
  await api.post('/users/register/prestataire', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function registerClient(data: {
  email: string; password: string; nom: string; prenom: string;
  telephone: string; consentDataProcessing?: boolean;
}): Promise<void> {
  await api.post('/users/register/client', data);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.put('/auth/change-password', { currentPassword, newPassword });
}
