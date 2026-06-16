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

export async function clientRefuseProposal(id: string): Promise<void> {
  await api.post(`/requests/${id}/client/refuse-proposal`);
}

export interface Reaction {
  emoji: string;
  reactorEmail: string;
  createdAt: string;
}

export interface EditHistory {
  previousContent: string;
  editedAt: string;
  editedBy: string;
}

export interface Message {
  _id: string;
  fromRole: 'provider' | 'client';
  fromEmail: string;
  fromName: string;
  content: string;
  createdAt: string;
  readBy?: string[];
  reactions?: Reaction[];
  isPinned?: boolean;
  pinnedAt?: string;
  editedAt?: string;
  editHistory?: EditHistory[];
  isDeleted?: boolean;
  deletedAt?: string;
}

export async function sendMessage(requestId: string, content: string): Promise<Message[]> {
  const { data } = await api.post(`/requests/${requestId}/message`, { content });
  return data.messages;
}

export async function clientSendMessage(requestId: string, content: string): Promise<Message[]> {
  const { data } = await api.post(`/requests/${requestId}/client/message`, { content });
  return data.messages ?? [];
}

export async function markMessagesAsRead(requestId: string, messageIds: string[]): Promise<Message[]> {
  const { data } = await api.post(`/requests/${requestId}/messages/mark-read`, { messageIds });
  return data.messages;
}

export async function markMessagesAsReadByToken(token: string, messageIds: string[]): Promise<Message[]> {
  const { data } = await api.post('/requests/messages/read-by-token', { token, messageIds });
  return data.messages;
}

export async function addReaction(requestId: string, messageId: string, emoji: string): Promise<Message[]> {
  const { data } = await api.post(`/requests/${requestId}/messages/react`, { messageId, emoji });
  return data.messages;
}

export async function addReactionByToken(token: string, messageId: string, emoji: string): Promise<Message[]> {
  const { data } = await api.post('/requests/messages/react', { token, messageId, emoji });
  return data.messages;
}

export async function searchMessages(requestId: string, q: string): Promise<{ results: Message[]; total: number; query: string }> {
  const { data } = await api.get(`/requests/${requestId}/messages/search`, { params: { q } });
  return data;
}

export async function searchMessagesByToken(token: string, q: string): Promise<{ results: Message[]; total: number; query: string }> {
  const { data } = await api.get('/requests/messages/search', { params: { token, q } });
  return data;
}

export async function pinMessage(requestId: string, messageId: string): Promise<Message[]> {
  const { data } = await api.post(`/requests/${requestId}/messages/pin`, { messageId });
  return data.messages;
}

export async function unpinMessage(requestId: string, messageId: string): Promise<Message[]> {
  const { data } = await api.post(`/requests/${requestId}/messages/unpin`, { messageId });
  return data.messages;
}

export async function editMessage(requestId: string, messageId: string, content: string): Promise<Message[]> {
  const { data } = await api.post(`/requests/${requestId}/messages/edit`, { messageId, content });
  return data.messages;
}

export async function deleteMessage(requestId: string, messageId: string): Promise<Message[]> {
  const { data } = await api.post(`/requests/${requestId}/messages/delete`, { messageId });
  return data.messages;
}

export interface ForwardTarget {
  _id: string;
  status: string;
  displayName: string;
  createdAt: string;
}

export async function forwardMessage(requestId: string, messageId: string, targetRequestId: string): Promise<Message[]> {
  const { data } = await api.post(`/requests/${requestId}/messages/forward`, { messageId, targetRequestId });
  return data.messages;
}

export async function getForwardTargets(requestId: string): Promise<{ targets: ForwardTarget[] }> {
  const { data } = await api.get(`/requests/${requestId}/messages/forward-targets`);
  return data;
}

export async function archiveRequest(requestId: string): Promise<{ ok: boolean }> {
  const { data } = await api.patch(`/requests/${requestId}/archive`);
  return data;
}

export async function unarchiveRequest(requestId: string): Promise<{ ok: boolean }> {
  const { data } = await api.patch(`/requests/${requestId}/unarchive`);
  return data;
}

export async function addLabel(requestId: string, labelName: string): Promise<{ ok: boolean; labels: Label[] }> {
  const { data } = await api.post(`/requests/${requestId}/labels/add`, { labelName });
  return data;
}

export async function removeLabel(requestId: string, labelName: string): Promise<{ ok: boolean; labels: Label[] }> {
  const { data } = await api.post(`/requests/${requestId}/labels/remove`, { labelName });
  return data;
}

export async function listLabels(): Promise<{ labels: Array<{ name: string; count: number }> }> {
  const { data } = await api.get('/requests/labels');
  return data;
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
  messageToken?: string;
  isArchived?: boolean;
  labels?: Label[];
}

export async function listClientThreads(): Promise<{ threads: ClientThread[] }> {
  const { data } = await api.get('/requests/messages/client-threads');
  return data;
}

export interface Label {
  name: string;
  color?: string;
  createdAt: string;
}

export interface Thread {
  _id: string;
  requesterEmail: string;
  requesterName: string;
  status: string;
  messageCount: number;
  lastMessage: Message;
  createdAt: string;
  isArchived?: boolean;
  labels?: Label[];
}

export async function getThreadByToken(token: string): Promise<{ messages: Message[]; prestataireName: string; clientEmail: string }> {
  const { data } = await api.get('/requests/messages/thread', { params: { token } });
  return data;
}

export async function replyByToken(token: string, content: string): Promise<{ newToken: string }> {
  const { data } = await api.post('/requests/messages/reply', { token, content });
  return data;
}
