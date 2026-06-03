import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import MessageReply from '../components/vue/MessageReply.vue';

const { mockGetThreadByToken, mockReplyByToken } = vi.hoisted(() => ({
  mockGetThreadByToken: vi.fn(),
  mockReplyByToken: vi.fn(),
}));

vi.mock('../services/requests', () => ({
  getThreadByToken: mockGetThreadByToken,
  replyByToken: mockReplyByToken,
}));

const sampleThread = {
  messages: [
    { _id: '1', fromRole: 'prestataire', fromEmail: 'p@g.fr', fromName: 'Paul', content: 'Bonjour !', createdAt: '2024-06-01T10:00:00Z' },
    { _id: '2', fromRole: 'client', fromEmail: 'c@g.fr', fromName: 'Claire', content: 'Merci.', createdAt: '2024-06-01T11:00:00Z' },
  ],
  prestataireName: 'Paul Jardinier',
  clientEmail: 'claire@test.fr',
};

function setToken(token: string) {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { search: token ? `?token=${token}` : '' },
  });
}

describe('MessageReply', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setToken('tok-abc');
  });

  it('shows loading state initially', () => {
    mockGetThreadByToken.mockReturnValue(new Promise(() => {}));
    const wrapper = mount(MessageReply);
    expect(wrapper.find('.loading').exists()).toBe(true);
  });

  it('shows invalid state when no token in URL', async () => {
    setToken('');
    const wrapper = mount(MessageReply);
    await flushPromises();
    expect(wrapper.find('.invalid').exists()).toBe(true);
    expect(wrapper.find('.invalid h2').text()).toContain('invalide');
  });

  it('shows invalid state when API throws', async () => {
    mockGetThreadByToken.mockRejectedValueOnce(new Error('expired'));
    const wrapper = mount(MessageReply);
    await flushPromises();
    expect(wrapper.find('.invalid').exists()).toBe(true);
  });

  it('renders thread messages after successful load', async () => {
    mockGetThreadByToken.mockResolvedValueOnce(sampleThread);
    const wrapper = mount(MessageReply);
    await flushPromises();

    expect(wrapper.find('.thread-title').text()).toContain('Paul Jardinier');
    expect(wrapper.findAll('.msg')).toHaveLength(2);
    expect(wrapper.find('.msg--provider .msg-content').text()).toBe('Bonjour !');
    expect(wrapper.find('.msg--client .msg-content').text()).toBe('Merci.');
  });

  it('sends a reply and shows success banner', async () => {
    mockGetThreadByToken.mockResolvedValueOnce(sampleThread);
    mockReplyByToken.mockResolvedValueOnce({ newToken: 'tok-new' });

    const wrapper = mount(MessageReply);
    await flushPromises();

    await wrapper.find('textarea').setValue('Ma réponse');
    await wrapper.find('.btn-send').trigger('click');
    await flushPromises();

    expect(mockReplyByToken).toHaveBeenCalledWith('tok-abc', 'Ma réponse');
    expect(wrapper.find('.sent-banner').exists()).toBe(true);
    expect(wrapper.findAll('.msg')).toHaveLength(3);
  });

  it('shows error when reply fails', async () => {
    mockGetThreadByToken.mockResolvedValueOnce(sampleThread);
    mockReplyByToken.mockRejectedValueOnce(new Error('Network'));

    const wrapper = mount(MessageReply);
    await flushPromises();

    await wrapper.find('textarea').setValue('Message');
    await wrapper.find('.btn-send').trigger('click');
    await flushPromises();

    expect(wrapper.find('.error-msg').exists()).toBe(true);
    expect(wrapper.find('.sent-banner').exists()).toBe(false);
  });

  it('disables send button when textarea is empty', async () => {
    mockGetThreadByToken.mockResolvedValueOnce(sampleThread);
    const wrapper = mount(MessageReply);
    await flushPromises();

    const btn = wrapper.find('.btn-send');
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);
  });
});
