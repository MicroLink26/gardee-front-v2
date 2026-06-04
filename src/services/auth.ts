import { api } from './api';
import type { User, UserRole } from '../types';

export async function login(email: string, password: string): Promise<{ user: User; accessToken: string }> {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function refresh(): Promise<string> {
  const { data } = await api.post('/auth/refresh');
  return data.accessToken;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get('/auth/me');
  return data.user;
}

export async function getRoles(): Promise<{ role: UserRole }> {
  const { data } = await api.get('/auth/roles');
  return data;
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await api.post('/auth/reset-password', { token, password });
}

export async function checkEmail(email: string): Promise<{ exists: boolean }> {
  const { data } = await api.get('/auth/check-email', { params: { email } });
  return data;
}

export async function register(email: string, password: string, nom: string, prenom: string): Promise<{ user: User; accessToken: string } | { requiresVerification: true; userId: string }> {
  const { data } = await api.post('/auth/register', { email, password, nom, prenom });
  return data;
}

export async function verifyEmail(userId: string, code: string): Promise<{ user: User; accessToken: string }> {
  const { data } = await api.post('/auth/verify-email', { userId, code });
  return data;
}

export async function resendVerification(userId: string): Promise<void> {
  await api.post('/auth/resend-verification', { userId });
}

export async function changePassword(current: string, newPwd: string): Promise<void> {
  await api.put('/auth/change-password', { current, newPwd });
}
