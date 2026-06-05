<script setup lang="ts">
import { ref, onMounted, computed, nextTick, watch } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import { listThreads, listClientThreads, getMessages, sendMessage, clientSendMessage, type Thread, type ClientThread, type Message } from '../../../services/requests';
import { REQUEST_STATUS_LABELS } from '../../../types';

type AnyThread = (Thread & { _type: 'provider' }) | (ClientThread & { _type: 'client' });

const auth = useAuthStore();
const isPrestataire = computed(() => auth.user?.isPrestataire === true);

const threads = ref<AnyThread[]>([]);
const loading = ref(true);
const activeThread = ref<AnyThread | null>(null);
const messages = ref<Message[]>([]);
const loadingMessages = ref(false);
const newMessage = ref('');
const sending = ref(false);
const error = ref('');
const isTyping = ref(false);
const messagesContainer = ref<HTMLElement>();
const typingTimeout = ref<ReturnType<typeof setTimeout>>();

onMounted(async () => {
  await auth.fetchMe();
  await loadThreads();
});

async function loadThreads() {
  loading.value = true;
  try {
    if (isPrestataire.value) {
      const res = await listThreads();
      threads.value = res.threads.map(t => ({ ...t, _type: 'provider' as const }));
    } else {
      const res = await listClientThreads();
      threads.value = res.threads.map(t => ({ ...t, _type: 'client' as const }));
    }
  } finally {
    loading.value = false;
  }
}

function threadDisplayName(t: AnyThread): string {
  return t._type === 'provider'
    ? (t as Thread & { _type: 'provider' }).requesterName
    : (t as ClientThread & { _type: 'client' }).prestataireName;
}

async function openThread(thread: AnyThread) {
  activeThread.value = thread;
  if (thread._type === 'client') {
    messages.value = (thread as ClientThread & { _type: 'client' }).messages;
    loadingMessages.value = false;
    await scrollToBottom();
    return;
  }
  loadingMessages.value = true;
  try {
    const res = await getMessages(thread._id);
    messages.value = res.messages;
  } finally {
    loadingMessages.value = false;
    await scrollToBottom();
  }
}

async function scrollToBottom() {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

watch(messages, async () => {
  await scrollToBottom();
}, { deep: true });

function handleInput() {
  isTyping.value = true;
  if (typingTimeout.value) clearTimeout(typingTimeout.value);
  typingTimeout.value = setTimeout(() => {
    isTyping.value = false;
  }, 1500);
}

async function send() {
  if (!newMessage.value.trim() || !activeThread.value) return;
  error.value = '';
  isTyping.value = false;
  if (typingTimeout.value) clearTimeout(typingTimeout.value);
  sending.value = true;
  try {
    const content = newMessage.value.trim();
    newMessage.value = '';
    if (activeThread.value._type === 'provider') {
      messages.value = await sendMessage(activeThread.value._id, content);
    } else {
      const res = await clientSendMessage(activeThread.value._id, content);
      messages.value = res;
    }
    await loadThreads();
  } catch {
    error.value = 'Impossible d\'envoyer le message.';
  } finally {
    sending.value = false;
  }
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateGroup(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Aujourd\'hui';
  if (date.toDateString() === yesterday.toDateString()) return 'Hier';
  return date.toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function shouldShowDateGroup(idx: number): boolean {
  if (idx === 0) return true;
  const current = new Date(messages.value[idx].createdAt).toDateString();
  const prev = new Date(messages.value[idx - 1].createdAt).toDateString();
  return current !== prev;
}

function statusLabel(s: string) {
  return REQUEST_STATUS_LABELS[s as keyof typeof REQUEST_STATUS_LABELS] ?? s;
}
</script>

<template>
  <div class="messagerie">
    <div class="page-header">
      <p class="header-eyebrow">Espace personnel</p>
      <h1>Messagerie</h1>
      <p class="header-sub">{{ isPrestataire ? 'Échanges avec vos clients' : 'Vos échanges avec les prestataires' }}</p>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      Chargement...
    </div>

    <div v-else-if="threads.length === 0" class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <p>Aucun echange pour le moment.</p>
      <p class="empty-sub">Les conversations apparaitront ici apres l'envoi d'un message depuis une demande.</p>
    </div>

    <div v-else class="layout">

      <!-- Liste des fils -->
      <div class="thread-list">
        <button
          v-for="t in threads"
          :key="t._id"
          :class="['thread-item', { active: activeThread?._id === t._id }]"
          @click="openThread(t)"
        >
          <div class="thread-avatar">{{ threadDisplayName(t)[0]?.toUpperCase() }}</div>
          <div class="thread-info">
            <div class="thread-name">{{ threadDisplayName(t) }}</div>
            <div class="thread-last">{{ t.lastMessage?.content?.slice(0, 60) }}{{ (t.lastMessage?.content?.length ?? 0) > 60 ? '...' : '' }}</div>
          </div>
          <div class="thread-meta">
            <span class="thread-count">{{ t.messageCount }}</span>
          </div>
        </button>
      </div>

      <!-- Fil de messages -->
      <div class="thread-view">
        <div v-if="!activeThread" class="no-thread">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <p>Selectionnez une conversation</p>
        </div>

        <template v-else>
          <div class="thread-header">
            <div class="thread-header-name">{{ threadDisplayName(activeThread) }}</div>
            <span class="status-badge">{{ statusLabel(activeThread.status) }}</span>
          </div>

          <div v-if="loadingMessages" class="loading" style="padding:2rem">
            <div class="spinner"></div>
          </div>

          <div v-else ref="messagesContainer" class="messages-list">
            <template v-for="(m, idx) in messages" :key="m._id">
              <div v-if="shouldShowDateGroup(idx)" class="date-group">
                {{ formatDateGroup(m.createdAt) }}
              </div>
              <div :class="['msg', m.fromRole === 'provider' ? 'msg--provider' : 'msg--client']">
                <div class="msg-bubble">
                  <div class="msg-content">{{ m.content }}</div>
                  <div class="msg-meta">{{ formatTime(m.createdAt) }}</div>
                </div>
              </div>
            </template>

            <div v-if="isTyping" class="msg msg--client msg-typing">
              <div class="msg-bubble">
                <div class="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          </div>

          <div class="compose">
            <div class="compose-typing" v-if="isTyping">
              <span class="typing-dot">●</span> En train d'écrire...
            </div>
            <textarea
              v-model="newMessage"
              rows="3"
              placeholder="Votre message..."
              @keydown.ctrl.enter="send"
              @input="handleInput"
            ></textarea>
            <div class="compose-footer">
              <p v-if="error" class="error-msg">{{ error }}</p>
              <span class="compose-hint">Ctrl+Entree pour envoyer</span>
              <button class="btn-send" :disabled="sending || !newMessage.trim()" @click="send">
                {{ sending ? 'Envoi...' : 'Envoyer' }}
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.messagerie { display: flex; flex-direction: column; gap: 1.5rem; height: 100%; }

.page-header { padding-bottom: 1.5rem; border-bottom: 1px solid #e9e5d6; }
.header-eyebrow { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #a8c47a; margin: 0 0 0.35rem; display: block; }
.page-header h1 { font-size: 1.5rem; font-weight: 900; color: #1a1a0e; margin: 0 0 0.2rem; letter-spacing: -0.02em; }
.header-sub { font-size: 0.85rem; color: #9ca3af; margin: 0; }

.loading { display: flex; align-items: center; gap: 0.75rem; color: #9ca3af; font-size: 0.875rem; padding: 2rem 0; }
.spinner { width: 20px; height: 20px; border: 2px solid #e9e5d6; border-top-color: #3a5020; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 4rem 2rem; text-align: center; color: #9ca3af; }
.empty-sub { font-size: 0.8rem; max-width: 320px; }

.layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.25rem;
  flex: 1;
  min-height: 0;
  height: calc(100vh - 220px);
}

/* Thread list */
.thread-list {
  display: flex; flex-direction: column; gap: 0.375rem;
  overflow-y: auto;
  background: #FCFAF5; border: 1.5px solid #e9e5d6; border-radius: 16px;
  padding: 0.625rem;
}

.thread-item {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.75rem 0.875rem; border-radius: 12px;
  background: none; border: none; cursor: pointer; text-align: left;
  font-family: inherit; transition: background 0.15s;
  width: 100%;
}
.thread-item:hover { background: #f0ede3; }
.thread-item.active { background: #e8f0d8; }

.thread-avatar {
  width: 38px; height: 38px; border-radius: 50%;
  background: #dde6c8; color: #3a5020;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 0.875rem; flex-shrink: 0;
}
.thread-info { flex: 1; min-width: 0; }
.thread-name { font-size: 0.875rem; font-weight: 700; color: #1a1a0e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.thread-last { font-size: 0.75rem; color: #9ca3af; margin-top: 0.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.thread-meta { flex-shrink: 0; }
.thread-count {
  font-size: 0.7rem; font-weight: 700;
  background: #3a5020; color: #fff;
  padding: 0.1rem 0.45rem; border-radius: 999px;
}

/* Thread view */
.thread-view {
  display: flex; flex-direction: column;
  background: #FCFAF5; border: 1.5px solid #e9e5d6; border-radius: 16px;
  overflow: hidden;
}

.no-thread {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.75rem; color: #9ca3af; font-size: 0.875rem;
}

.thread-header {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 1rem 1.25rem; border-bottom: 1px solid #e9e5d6;
  flex-shrink: 0;
}
.thread-header-name { font-size: 0.95rem; font-weight: 700; color: #1a1a0e; flex: 1; }
.status-badge {
  font-size: 0.7rem; font-weight: 700;
  background: rgba(168,196,122,0.15); color: #3a5020;
  padding: 0.18rem 0.55rem; border-radius: 999px;
  border: 1px solid rgba(168,196,122,0.3);
}

.messages-list {
  flex: 1; overflow-y: auto;
  display: flex; flex-direction: column; gap: 0.75rem;
  padding: 1.25rem;
}

.msg { display: flex; }
.msg--provider { justify-content: flex-end; }
.msg--client { justify-content: flex-start; }

.msg-bubble {
  max-width: 70%; padding: 0.75rem 1rem;
  border-radius: 16px;
}
.msg--provider .msg-bubble {
  background: #3a5020; color: #fff;
  border-bottom-right-radius: 4px;
}
.msg--client .msg-bubble {
  background: #f0ede3; color: #1a1a0e;
  border-bottom-left-radius: 4px;
  border: 1px solid #e4e0d0;
}

.msg-content { font-size: 0.9rem; line-height: 1.55; white-space: pre-wrap; }
.msg-meta { font-size: 0.7rem; margin-top: 0.35rem; opacity: 0.6; }

/* Date group divider */
.date-group {
  display: flex; align-items: center; gap: 0.75rem;
  margin: 0.75rem 0 0.5rem;
  font-size: 0.75rem; font-weight: 600;
  color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;
}
.date-group::before, .date-group::after {
  content: ''; flex: 1; height: 1px; background: #e9e5d6;
}

/* Typing indicator */
.typing-indicator {
  display: flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0;
}
.typing-indicator span {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  animation: bounce 1.4s infinite;
}
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
  30% { transform: translateY(-8px); opacity: 1; }
}

.msg-typing { opacity: 0.7; }

/* Compose typing indicator */
.compose-typing {
  font-size: 0.75rem; color: #9ca3af; margin-bottom: 0.5rem;
  display: flex; align-items: center; gap: 0.35rem;
}
.typing-dot {
  font-size: 0.6rem; animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* Compose */
.compose {
  border-top: 1px solid #e9e5d6; padding: 1rem 1.25rem;
  flex-shrink: 0;
}
.compose textarea {
  width: 100%; padding: 0.6rem 0.875rem;
  border: 1.5px solid #e9e5d6; border-radius: 10px;
  font-size: 0.9rem; font-family: inherit; color: #1a1a0e;
  background: #f5f2eb; resize: none;
  transition: border-color 0.15s, background 0.15s;
}
.compose textarea:focus { outline: none; border-color: #515F37; background: #FCFAF5; }
.compose-footer { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.625rem; }
.compose-hint { font-size: 0.72rem; color: #9ca3af; flex: 1; }
.error-msg { color: #ef4444; font-size: 0.8rem; margin: 0; }

.btn-send {
  padding: 0.55rem 1.375rem;
  background: #3a5020; color: #fff;
  border: none; border-radius: 8px;
  cursor: pointer; font-weight: 700; font-size: 0.875rem;
  font-family: inherit; transition: background 0.15s;
}
.btn-send:hover:not(:disabled) { background: #253515; }
.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 768px) {
  .layout { grid-template-columns: 1fr; height: auto; }
  .thread-list { max-height: 200px; }
}
</style>
