import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApiGet, mockApiPost, mockApiPatch } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
  mockApiPatch: vi.fn(),
}));

vi.mock('../services/api', () => ({
  api: { get: mockApiGet, post: mockApiPost, patch: mockApiPatch },
  setAccessToken: vi.fn(),
}));

import * as req from '../services/requests';

describe('requests service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createRequest calls POST /requests', async () => {
    mockApiPost.mockResolvedValueOnce({ data: { id: 'new-id' } });
    const result = await req.createRequest({ prestataireId: 'pid', requesterEmail: 'u@b.com' });
    expect(mockApiPost).toHaveBeenCalledWith('/requests', expect.objectContaining({ prestataireId: 'pid' }));
    expect(result).toEqual({ id: 'new-id' });
  });

  it('confirmRequest calls GET /requests/confirm with token', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { status: 'confirmed' } });
    const result = await req.confirmRequest('conf-tok');
    expect(mockApiGet).toHaveBeenCalledWith('/requests/confirm', { params: { token: 'conf-tok' } });
    expect(result).toEqual({ status: 'confirmed' });
  });

  it('listMyRequests calls GET /requests/mine', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { items: [], total: 0 } });
    await req.listMyRequests({ page: 1 });
    expect(mockApiGet).toHaveBeenCalledWith('/requests/mine', { params: { page: 1 } });
  });

  it('listMyClientRequests calls GET /requests/mine/client', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { items: [], total: 0 } });
    await req.listMyClientRequests({ pageSize: 5 });
    expect(mockApiGet).toHaveBeenCalledWith('/requests/mine/client', { params: { pageSize: 5 } });
  });

  it('providerAccept calls POST /requests/:id/provider/accept', async () => {
    mockApiPost.mockResolvedValueOnce({});
    await req.providerAccept('req-1');
    expect(mockApiPost).toHaveBeenCalledWith('/requests/req-1/provider/accept');
  });

  it('providerPropose calls PATCH /requests/:id/provider/propose', async () => {
    mockApiPatch.mockResolvedValueOnce({});
    await req.providerPropose('req-1', '2025-07-01', 'Je suis dispo');
    expect(mockApiPatch).toHaveBeenCalledWith('/requests/req-1/provider/propose', { date: '2025-07-01', comment: 'Je suis dispo' });
  });

  it('providerRefuse calls POST /requests/:id/provider/refuse', async () => {
    mockApiPost.mockResolvedValueOnce({});
    await req.providerRefuse('req-1', 'Indisponible');
    expect(mockApiPost).toHaveBeenCalledWith('/requests/req-1/provider/refuse', { message: 'Indisponible' });
  });

  it('providerCancel calls POST /requests/:id/provider/cancel', async () => {
    mockApiPost.mockResolvedValueOnce({});
    await req.providerCancel('req-1');
    expect(mockApiPost).toHaveBeenCalledWith('/requests/req-1/provider/cancel');
  });

  it('clientAcceptProposal calls POST /requests/:id/client/accept-proposal', async () => {
    mockApiPost.mockResolvedValueOnce({});
    await req.clientAcceptProposal('req-1');
    expect(mockApiPost).toHaveBeenCalledWith('/requests/req-1/client/accept-proposal');
  });

  it('markComplete calls POST /requests/:id/complete', async () => {
    mockApiPost.mockResolvedValueOnce({});
    await req.markComplete('req-1');
    expect(mockApiPost).toHaveBeenCalledWith('/requests/req-1/complete');
  });

  it('clientAcceptProposalByToken calls GET /requests/proposal/accept', async () => {
    mockApiGet.mockResolvedValueOnce({});
    await req.clientAcceptProposalByToken('prop-tok');
    expect(mockApiGet).toHaveBeenCalledWith('/requests/proposal/accept', { params: { token: 'prop-tok' } });
  });

  it('clientRefuseProposalByToken calls GET /requests/proposal/refuse', async () => {
    mockApiGet.mockResolvedValueOnce({});
    await req.clientRefuseProposalByToken('prop-tok');
    expect(mockApiGet).toHaveBeenCalledWith('/requests/proposal/refuse', { params: { token: 'prop-tok' } });
  });

  it('sendMessage calls POST /requests/:id/message and returns messages', async () => {
    const messages = [{ _id: '1', content: 'Bonjour' }];
    mockApiPost.mockResolvedValueOnce({ data: { messages } });
    const result = await req.sendMessage('req-1', 'Bonjour');
    expect(mockApiPost).toHaveBeenCalledWith('/requests/req-1/message', { content: 'Bonjour' });
    expect(result).toEqual(messages);
  });

  it('clientSendMessage returns messages array', async () => {
    const messages = [{ _id: '1', content: 'Réponse' }];
    mockApiPost.mockResolvedValueOnce({ data: { messages } });
    const result = await req.clientSendMessage('req-1', 'Réponse');
    expect(result).toEqual(messages);
  });

  it('clientSendMessage falls back to empty array when messages is undefined', async () => {
    mockApiPost.mockResolvedValueOnce({ data: {} });
    const result = await req.clientSendMessage('req-1', 'Réponse');
    expect(result).toEqual([]);
  });

  it('getMessages calls GET /requests/:id/messages', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { messages: [], token: 'msg-tok' } });
    const result = await req.getMessages('req-1');
    expect(mockApiGet).toHaveBeenCalledWith('/requests/req-1/messages');
    expect(result).toEqual({ messages: [], token: 'msg-tok' });
  });

  it('listThreads calls GET /requests/messages/threads', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { threads: [] } });
    const result = await req.listThreads();
    expect(mockApiGet).toHaveBeenCalledWith('/requests/messages/threads');
    expect(result).toEqual({ threads: [] });
  });

  it('listClientThreads calls GET /requests/messages/client-threads', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { threads: [] } });
    const result = await req.listClientThreads();
    expect(mockApiGet).toHaveBeenCalledWith('/requests/messages/client-threads');
    expect(result).toEqual({ threads: [] });
  });

  it('getThreadByToken calls GET /requests/messages/thread with token', async () => {
    const payload = { messages: [], prestataireName: 'Jean', clientEmail: 'u@b.com' };
    mockApiGet.mockResolvedValueOnce({ data: payload });
    const result = await req.getThreadByToken('msg-tok');
    expect(mockApiGet).toHaveBeenCalledWith('/requests/messages/thread', { params: { token: 'msg-tok' } });
    expect(result).toEqual(payload);
  });

  it('replyByToken calls POST /requests/messages/reply and returns newToken', async () => {
    mockApiPost.mockResolvedValueOnce({ data: { newToken: 'new-tok' } });
    const result = await req.replyByToken('old-tok', 'Ma réponse');
    expect(mockApiPost).toHaveBeenCalledWith('/requests/messages/reply', { token: 'old-tok', content: 'Ma réponse' });
    expect(result).toEqual({ newToken: 'new-tok' });
  });
});
