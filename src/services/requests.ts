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

export async function markComplete(id: string): Promise<void> {
  await api.post(`/requests/${id}/complete`);
}

export async function clientAcceptProposalByToken(token: string): Promise<void> {
  await api.get('/requests/proposal/accept', { params: { token } });
}

export async function clientRefuseProposalByToken(token: string): Promise<void> {
  await api.get('/requests/proposal/refuse', { params: { token } });
}

export interface Message {
  _id: string;
  fromRole: 'provider' | 'client';
  fromEmail: string;
  fromName: string;
  content: string;
  createdAt: string;
}

export async function sendMessage(requestId: string, content: string): Promise<Message[]> {
  const { data } = await api.post(`/requests/${requestId}/message`, { content });
  return data.messages;
}

export async function clientSendMessage(requestId: string, content: string): Promise<Message[]> {
  const { data } = await api.post(`/requests/${requestId}/client/message`, { content });
  return data.messages ?? [];
}

export async function getMessages(requestId: string): Promise<{ messages: Message[]; token?: string }> {
  const { data } = await api.get(`/requests/${requestId}/messages`);
  return data;
}

export async function listThreads(): Promise<{ threads: Thread[] }> {
  const { data } = await api.get('/requests/messages/threads');
  return data;
}

export interface ClientThread {
  _id: string;
  prestataireName: string;
  status: string;
  messageCount: number;
  lastMessage: Message;
  messages: Message[];
  createdAt: string;
}

export async function listClientThreads(): Promise<{ threads: ClientThread[] }> {
  const { data } = await api.get('/requests/messages/client-threads');
  return data;
}

export interface Thread {
  _id: string;
  requesterEmail: string;
  requesterName: string;
  status: string;
  messageCount: number;
  lastMessage: Message;
  createdAt: string;
}

export async function getThreadByToken(token: string): Promise<{ messages: Message[]; prestataireName: string; clientEmail: string }> {
  const { data } = await api.get('/requests/messages/thread', { params: { token } });
  return data;
}

export async function replyByToken(token: string, content: string): Promise<{ newToken: string }> {
  const { data } = await api.post('/requests/messages/reply', { token, content });
  return data;
}
