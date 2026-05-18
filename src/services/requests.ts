import { api } from './api';
import type { ServiceRequest, PaginatedResult } from '../types';

export async function createRequest(data: {
  prestataireId: string;
  requesterEmail: string;
  requesterNom?: string;
  requesterPrenom?: string;
  requesterTelephone?: string;
  prestations?: string[];
  estimatedHours?: number;
  recurring?: boolean;
  description?: string;
  subject?: string;
  address?: string;
  codePostal?: string;
  ville?: string;
  desiredAt?: string;
}): Promise<{ id: string }> {
  const { data: res } = await api.post('/requests', data);
  return res;
}

export async function confirmRequest(token: string): Promise<{ status: string }> {
  const { data } = await api.get('/requests/confirm', { params: { token } });
  return data;
}

export async function listMyRequests(params?: { page?: number; pageSize?: number }): Promise<PaginatedResult<ServiceRequest>> {
  const { data } = await api.get('/requests/mine', { params });
  return data;
}

export async function listMyClientRequests(params?: { page?: number; pageSize?: number }): Promise<PaginatedResult<ServiceRequest>> {
  const { data } = await api.get('/requests/mine/client', { params });
  return data;
}

export async function providerAccept(id: string): Promise<void> {
  await api.post(`/requests/${id}/provider/accept`);
}

export async function providerPropose(id: string, date: string, comment?: string): Promise<void> {
  await api.patch(`/requests/${id}/provider/propose`, { date, comment });
}

export async function providerRefuse(id: string, message?: string): Promise<void> {
  await api.post(`/requests/${id}/provider/refuse`, { message });
}

export async function providerCancel(id: string): Promise<void> {
  await api.post(`/requests/${id}/provider/cancel`);
}

export async function clientAcceptProposal(id: string): Promise<void> {
  await api.post(`/requests/${id}/client/accept-proposal`);
}
