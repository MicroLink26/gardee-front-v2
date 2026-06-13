<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import { listThreads, listClientThreads, getMessages, sendMessage, clientSendMessage, markMessagesAsRead, markMessagesAsReadByToken, addReaction, addReactionByToken, searchMessages, searchMessagesByToken, pinMessage, unpinMessage, editMessage, deleteMessage, forwardMessage, getForwardTargets, archiveRequest, unarchiveRequest, addLabel, removeLabel, listLabels, type Thread, type ClientThread, type Message, type ForwardTarget, type Label, type EditHistory } from '../../../services/requests';
import { REQUEST_STATUS_LABELS } from '../../../types';

type AnyThread = (Thread & { _type: 'provider' }) | (ClientThread & { _type: 'client' });

const auth = useAuthStore();
const isPrestataire = computed(() => auth.user?.isPrestataire === true);
const pinnedMessages = computed(() => messages.value.filter(m => m.isPinned));
const filteredThreads = computed(() => {
  const baseThreads = activeThreadsView.value;
  if (!selectedLabelFilter.value) return baseThreads;
  return baseThreads.filter(t => (t.labels ?? []).some(l => l.name === selectedLabelFilter.value));
});

const currentModalReactions = computed(() => {
  if (!reactionModalMessageId.value || !reactionModalEmoji.value) return [];
  const message = messages.value.find(m => m._id === reactionModalMessageId.value);
  if (!message) return [];
  return (message.reactions ?? []).filter(r => r.emoji === reactionModalEmoji.value);
});

const currentEditHistory = computed(() => {
  if (!editHistoryMessageId.value) return [];
  const message = messages.value.find(m => m._id === editHistoryMessageId.value);
  if (!message) return [];
  return message.editHistory ?? [];
});

const threads = ref<AnyThread[]>([]);
const loading = ref(true);
const activeThread = ref<AnyThread | null>(null);
const messages = ref<Message[]>([]);
const loadingMessages = ref(false);
const newMessage = ref('');
const sending = ref(false);
const error = ref('');
const typingUser = ref<{ email: string; name: string } | null>(null);
const messagesContainer = ref<HTMLElement>();
const typingTimeout = ref<ReturnType<typeof setTimeout>>();

const isTyping = computed(() => typingUser.value !== null);
const currentUserEmail = computed(() => auth.user?.email || '');
const reactionPickerMessageId = ref<string | null>(null);
const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
const searchQuery = ref('');
const searchResults = ref<Message[]>([]);
const isSearching = ref(false);
const searchLoading = ref(false);
const editingMessageId = ref<string | null>(null);
const editingContent = ref('');
const forwardingMessageId = ref<string | null>(null);
const forwardTargets = ref<ForwardTarget[]>([]);
const forwardLoading = ref(false);
const showArchived = ref(false);
const archivedThreads = ref<AnyThread[]>([]);
const activeThreadsView = computed(() => showArchived.value ? archivedThreads.value : threads.value);
const allLabels = ref<Array<{ name: string; count: number }>>([]);
const selectedLabelFilter = ref<string | null>(null);
const showLabelModal = ref(false);
const currentLabelInput = ref('');
const labelModalThreadId = ref<string | null>(null);
const showReactionModal = ref(false);
const reactionModalEmoji = ref<string | null>(null);
const reactionModalMessageId = ref<string | null>(null);
const showEditHistoryModal = ref(false);
const editHistoryMessageId = ref<string | null>(null);

let pollTimer: ReturnType<typeof setInterval> | null = null;

async function refreshActiveThread() {
  if (!activeThread.value || activeThread.value._type === 'client') return;
  try {
    const res = await getMessages(activeThread.value._id);
    const incoming = res.messages as Message[];
    if (incoming.length > messages.value.length) {
      messages.value = incoming;
      await scrollToBottom();
    }
  } catch { /* silencieux */ }
}

onMounted(async () => {
  await auth.fetchMe();
  await Promise.all([loadThreads(), loadLabels()]);
  // Rafraîchit la conversation active toutes les 30s
  pollTimer = setInterval(refreshActiveThread, 30_000);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});

async function loadLabels() {
  try {
    const res = await listLabels();
    allLabels.value = res.labels;
  } catch {
    allLabels.value = [];
  }
}

async function loadThreads() {
  loading.value = true;
  try {
    if (isPrestataire.value) {
      const res = await listThreads();
      threads.value = res.threads
        .filter(t => !t.isArchived)
        .map(t => ({ ...t, _type: 'provider' as const }));
      archivedThreads.value = res.threads
        .filter(t => t.isArchived)
        .map(t => ({ ...t, _type: 'provider' as const }));
    } else {
      const res = await listClientThreads();
      threads.value = res.threads
        .filter(t => !t.isArchived)
        .map(t => ({ ...t, _type: 'client' as const }));
      archivedThreads.value = res.threads
        .filter(t => t.isArchived)
        .map(t => ({ ...t, _type: 'client' as const }));
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
  await markUnreadAsRead();
}, { deep: true });

async function markUnreadAsRead() {
  if (!activeThread.value || !currentUserEmail.value) return;

  const unreadMessageIds = messages.value
    .filter(m => m.fromRole !== (isPrestataire.value ? 'provider' : 'client') && (!m.readBy?.includes(currentUserEmail.value)))
    .map(m => m._id);

  if (unreadMessageIds.length === 0) return;

  try {
    if (activeThread.value._type === 'provider') {
      await markMessagesAsRead(activeThread.value._id, unreadMessageIds);
    } else {
      const token = (activeThread.value as ClientThread & { _type: 'client' }).messageToken;
      if (token) {
        await markMessagesAsReadByToken(token, unreadMessageIds);
      }
    }
  } catch {
    // Silent fail - read receipts are not critical
  }
}

function handleInput() {
  typingUser.value = {
    email: auth.user?.email || '',
    name: auth.user?.prenom && auth.user?.nom
      ? `${auth.user.prenom} ${auth.user.nom}`.trim()
      : (auth.user?.email?.split('@')[0] || 'User'),
  };
  if (typingTimeout.value) clearTimeout(typingTimeout.value);
  typingTimeout.value = setTimeout(() => {
    typingUser.value = null;
  }, 1500);
}

async function send() {
  if (!newMessage.value.trim() || !activeThread.value) return;
  error.value = '';
  typingUser.value = null;
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

function isMessageRead(message: Message): boolean {
  return message.readBy?.includes(currentUserEmail.value) ?? false;
}

async function toggleReaction(messageId: string, emoji: string) {
  if (!activeThread.value) return;

  try {
    if (activeThread.value._type === 'provider') {
      messages.value = await addReaction(activeThread.value._id, messageId, emoji);
    } else {
      const token = (activeThread.value as ClientThread & { _type: 'client' }).messageToken;
      if (token) {
        messages.value = await addReactionByToken(token, messageId, emoji);
      }
    }
    reactionPickerMessageId.value = null;
  } catch {
    // Silent fail
  }
}

function getReactionGroups(message: Message) {
  const groups = new Map<string, number>();
  message.reactions?.forEach(r => {
    groups.set(r.emoji, (groups.get(r.emoji) || 0) + 1);
  });
  return Array.from(groups.entries());
}

async function performSearch() {
  if (!activeThread.value || searchQuery.value.trim().length < 2) {
    searchResults.value = [];
    return;
  }

  searchLoading.value = true;
  try {
    let results;
    if (activeThread.value._type === 'provider') {
      const res = await searchMessages(activeThread.value._id, searchQuery.value);
      results = res.results;
    } else {
      const token = (activeThread.value as ClientThread & { _type: 'client' }).messageToken;
      if (token) {
        const res = await searchMessagesByToken(token, searchQuery.value);
        results = res.results;
      } else {
        return;
      }
    }
    searchResults.value = results;
  } catch {
    searchResults.value = [];
  } finally {
    searchLoading.value = false;
  }
}

function highlightText(text: string, query: string): string {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

async function togglePin(messageId: string) {
  if (!activeThread.value) return;

  try {
    if (isPrestataire.value) {
      const message = messages.value.find(m => m._id === messageId);
      if (message?.isPinned) {
        messages.value = await unpinMessage(activeThread.value._id, messageId);
      } else {
        messages.value = await pinMessage(activeThread.value._id, messageId);
      }
    }
  } catch {
    // Silent fail
  }
}

function startEdit(message: Message) {
  editingMessageId.value = message._id;
  editingContent.value = message.content;
}

async function saveEdit(messageId: string) {
  if (!activeThread.value || !editingContent.value.trim()) return;

  try {
    messages.value = await editMessage(activeThread.value._id, messageId, editingContent.value);
    editingMessageId.value = null;
    editingContent.value = '';
  } catch {
    // Silent fail
  }
}

function cancelEdit() {
  editingMessageId.value = null;
  editingContent.value = '';
}

async function handleDelete(messageId: string) {
  if (!activeThread.value || !confirm('Supprimer ce message?')) return;

  try {
    messages.value = await deleteMessage(activeThread.value._id, messageId);
  } catch {
    // Silent fail
  }
}

async function openForwardPicker(messageId: string) {
  forwardingMessageId.value = messageId;
  forwardLoading.value = true;
  try {
    if (activeThread.value) {
      const res = await getForwardTargets(activeThread.value._id);
      forwardTargets.value = res.targets;
    }
  } catch {
    forwardTargets.value = [];
  } finally {
    forwardLoading.value = false;
  }
}

async function doForward(targetRequestId: string) {
  if (!activeThread.value || !forwardingMessageId.value) return;

  try {
    await forwardMessage(activeThread.value._id, forwardingMessageId.value, targetRequestId);
    forwardingMessageId.value = null;
    forwardTargets.value = [];
  } catch {
    // Silent fail
  }
}

async function toggleArchive(thread: AnyThread, event: Event) {
  event.stopPropagation();
  try {
    if (thread.isArchived) {
      await unarchiveRequest(thread._id);
      archivedThreads.value = archivedThreads.value.filter(t => t._id !== thread._id);
      threads.value.push(thread);
      if (activeThread.value?._id === thread._id) activeThread.value = null;
    } else {
      await archiveRequest(thread._id);
      threads.value = threads.value.filter(t => t._id !== thread._id);
      archivedThreads.value.push(thread);
      if (activeThread.value?._id === thread._id) activeThread.value = null;
    }
  } catch {
    // Silent fail
  }
}

async function openLabelModal(threadId: string, event: Event) {
  event.stopPropagation();
  labelModalThreadId.value = threadId;
  showLabelModal.value = true;
  currentLabelInput.value = '';
}

async function addLabelToThread() {
  if (!labelModalThreadId.value || !currentLabelInput.value.trim()) return;

  try {
    await addLabel(labelModalThreadId.value, currentLabelInput.value);
    await Promise.all([loadThreads(), loadLabels()]);
    currentLabelInput.value = '';
    showLabelModal.value = false;
  } catch {
    // Silent fail
  }
}

async function removeLabelFromThread(threadId: string, labelName: string, event: Event) {
  event.stopPropagation();
  try {
    await removeLabel(threadId, labelName);
    await Promise.all([loadThreads(), loadLabels()]);
  } catch {
    // Silent fail
  }
}

function openReactionModal(messageId: string, emoji: string, event: Event) {
  event.stopPropagation();
  reactionModalMessageId.value = messageId;
  reactionModalEmoji.value = emoji;
  showReactionModal.value = true;
}

function openEditHistoryModal(messageId: string, event: Event) {
  event.stopPropagation();
  editHistoryMessageId.value = messageId;
  showEditHistoryModal.value = true;
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

    <div v-else-if="threads.length === 0 && archivedThreads.length === 0" class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <p>Aucun echange pour le moment.</p>
      <p class="empty-sub">Les conversations apparaitront ici apres l'envoi d'un message depuis une demande.</p>
    </div>

    <div v-else class="layout">

      <!-- Liste des fils -->
      <div class="thread-list">
        <div v-if="archivedThreads.length > 0" class="thread-list-header">
          <button :class="['archive-toggle', { active: !showArchived }]" @click="showArchived = false">
            Actives {{ threads.length > 0 ? `(${threads.length})` : '' }}
          </button>
          <button :class="['archive-toggle', { active: showArchived }]" @click="showArchived = true">
            Archivées {{ archivedThreads.length > 0 ? `(${archivedThreads.length})` : '' }}
          </button>
        </div>

        <div v-if="allLabels.length > 0" class="label-filter">
          <button :class="['label-filter-btn', { active: !selectedLabelFilter }]" @click="selectedLabelFilter = null">
            Tous
          </button>
          <button v-for="label in allLabels" :key="label.name" :class="['label-filter-btn', { active: selectedLabelFilter === label.name }]" @click="selectedLabelFilter = label.name">
            {{ label.name }} ({{ label.count }})
          </button>
        </div>

        <template v-if="filteredThreads.length === 0">
          <div class="no-threads-msg">
            {{ selectedLabelFilter ? `Aucune conversation avec le label "${selectedLabelFilter}"` : (showArchived ? 'Aucune conversation archivée' : 'Aucune conversation active') }}
          </div>
        </template>

        <button
          v-for="t in filteredThreads"
          :key="t._id"
          :class="['thread-item', { active: activeThread?._id === t._id }]"
          @click="openThread(t)"
        >
          <div class="thread-avatar">{{ threadDisplayName(t)[0]?.toUpperCase() }}</div>
          <div class="thread-info">
            <div class="thread-name">{{ threadDisplayName(t) }}</div>
            <div v-if="(t.labels ?? []).length > 0" class="thread-labels">
              <span v-for="label in t.labels" :key="label.name" class="thread-label">{{ label.name }}</span>
            </div>
            <div class="thread-last">{{ t.lastMessage?.content?.slice(0, 60) }}{{ (t.lastMessage?.content?.length ?? 0) > 60 ? '...' : '' }}</div>
          </div>
          <div class="thread-actions">
            <button class="label-btn" @click="openLabelModal(t._id, $event)" title="Ajouter/gérer les labels">
              🏷️
            </button>
            <button class="archive-btn" @click="toggleArchive(t, $event)" :title="showArchived ? 'Restaurer' : 'Archiver'">
              {{ showArchived ? '↩️' : '📦' }}
            </button>
            <span class="thread-count">{{ t.messageCount }}</span>
          </div>
        </button>
      </div>

      <!-- Label Modal -->
      <div v-if="showLabelModal" class="label-modal-overlay" @click="showLabelModal = false">
        <div class="label-modal" @click.stop>
          <div class="label-modal-header">
            <h3>Ajouter/Gérer les labels</h3>
            <button class="close-btn" @click="showLabelModal = false">✕</button>
          </div>
          <div class="label-modal-body">
            <div v-if="labelModalThreadId" class="current-labels">
              <div v-if="threads.find(t => t._id === labelModalThreadId)?.labels?.length === 0" class="no-labels">
                Aucun label
              </div>
              <div v-for="label in threads.find(t => t._id === labelModalThreadId)?.labels ?? []" :key="label.name" class="label-item">
                <span class="label-name">{{ label.name }}</span>
                <button class="remove-label-btn" @click="removeLabelFromThread(labelModalThreadId, label.name, $event)">
                  ✕
                </button>
              </div>
            </div>
            <div class="add-label-input">
              <input v-model="currentLabelInput" type="text" placeholder="Nouveau label..." @keydown.enter="addLabelToThread">
              <button class="add-btn" @click="addLabelToThread">Ajouter</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Reaction History Modal -->
      <div v-if="showReactionModal" class="reaction-modal-overlay" @click="showReactionModal = false">
        <div class="reaction-modal" @click.stop>
          <div class="reaction-modal-header">
            <h3>{{ reactionModalEmoji }} Réactions</h3>
            <button class="close-btn" @click="showReactionModal = false">✕</button>
          </div>
          <div class="reaction-modal-body">
            <div v-if="currentModalReactions.length === 0" class="no-reactions">
              Aucune réaction
            </div>
            <div v-for="reaction in currentModalReactions" :key="`${reaction.reactorEmail}-${reaction.createdAt}`" class="reaction-item">
              <div class="reactor-info">
                <div class="reactor-name">{{ reaction.reactorEmail.split('@')[0] }}</div>
                <div class="reactor-email">{{ reaction.reactorEmail }}</div>
              </div>
              <div class="reaction-time">{{ formatTime(reaction.createdAt) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Edit History Modal -->
      <div v-if="showEditHistoryModal" class="edit-history-modal-overlay" @click="showEditHistoryModal = false">
        <div class="edit-history-modal" @click.stop>
          <div class="edit-history-modal-header">
            <h3>Historique des modifications</h3>
            <button class="close-btn" @click="showEditHistoryModal = false">✕</button>
          </div>
          <div class="edit-history-modal-body">
            <div v-if="currentEditHistory.length === 0" class="no-history">
              Aucune modification
            </div>
            <template v-else v-for="(edit, idx) in currentEditHistory" :key="`${edit.editedAt}-${idx}`">
              <div class="history-item">
                <div class="history-header">
                  <div class="history-editor">{{ edit.editedBy.split('@')[0] }}</div>
                  <div class="history-time">{{ formatTime(edit.editedAt) }}</div>
                </div>
                <div class="history-content">
                  <div class="content-label">Avant:</div>
                  <div class="content-text">{{ edit.previousContent }}</div>
                </div>
              </div>
            </template>
            <div class="current-content-item">
              <div class="history-header">
                <div class="history-editor">Version actuelle</div>
              </div>
              <div class="history-content">
                <div class="content-text">{{ messages.find(m => m._id === editHistoryMessageId)?.content }}</div>
              </div>
            </div>
          </div>
        </div>
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

          <div class="thread-search">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Chercher dans la conversation..."
              class="search-input"
              @input="performSearch"
              @keydown.escape="isSearching = false"
            />
            <button class="search-toggle" @click="isSearching = !isSearching; searchQuery = ''">
              {{ isSearching ? '✕' : '🔍' }}
            </button>
          </div>

          <div v-if="pinnedMessages.length > 0 && !isSearching" class="pinned-messages">
            <div class="pinned-header">📌 {{ pinnedMessages.length }} message{{ pinnedMessages.length > 1 ? 's' : '' }} épinglé{{ pinnedMessages.length > 1 ? 's' : '' }}</div>
            <div v-for="m in pinnedMessages" :key="m._id" class="pinned-msg">
              <div class="pinned-content">{{ m.content }}</div>
              <div class="pinned-meta">{{ m.fromName }} • {{ formatTime(m.createdAt) }}</div>
              <button v-if="isPrestataire" class="unpin-btn" @click="togglePin(m._id)">📌 Dépingler</button>
            </div>
          </div>

          <div v-if="loadingMessages" class="loading" style="padding:2rem">
            <div class="spinner"></div>
          </div>

          <div v-else-if="isSearching && searchQuery" class="messages-list">
            <div v-if="searchLoading" class="loading">
              <div class="spinner"></div> Recherche en cours...
            </div>
            <div v-else-if="searchResults.length === 0" class="empty">
              <p>Aucun résultat pour "{{ searchQuery }}"</p>
            </div>
            <template v-else v-for="m in searchResults" :key="m._id">
              <div :class="['msg-wrapper', m.fromRole === 'provider' ? 'msg-wrapper--provider' : 'msg-wrapper--client']">
                <div :class="['msg', m.fromRole === 'provider' ? 'msg--provider' : 'msg--client']">
                  <div class="msg-bubble">
                    <div class="msg-content" v-html="highlightText(m.content, searchQuery)"></div>
                    <div class="msg-meta">
                      {{ formatTime(m.createdAt) }} • {{ m.fromName }}
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <div v-else ref="messagesContainer" class="messages-list">
            <template v-for="(m, idx) in messages" :key="m._id">
              <div v-if="shouldShowDateGroup(idx)" class="date-group">
                {{ formatDateGroup(m.createdAt) }}
              </div>
              <div :class="['msg-wrapper', m.fromRole === 'provider' ? 'msg-wrapper--provider' : 'msg-wrapper--client']">
                <div v-if="editingMessageId === m._id" class="msg-edit-form">
                  <textarea v-model="editingContent" rows="3" class="edit-textarea"></textarea>
                  <div class="edit-actions">
                    <button class="btn-save-edit" @click="saveEdit(m._id)">Enregistrer</button>
                    <button class="btn-cancel-edit" @click="cancelEdit">Annuler</button>
                  </div>
                </div>
                <div v-else :class="['msg', m.fromRole === 'provider' ? 'msg--provider' : 'msg--client', m.isDeleted ? 'msg--deleted' : '']">
                  <div class="msg-bubble">
                    <div class="msg-content">{{ m.content }}</div>
                    <div class="msg-meta">
                      {{ formatTime(m.createdAt) }}
                      <button v-if="m.editedAt && (m.editHistory ?? []).length > 0" class="msg-edited" @click="openEditHistoryModal(m._id, $event)" title="Voir l'historique des modifications">
                        (édité)
                      </button>
                      <span v-else-if="m.editedAt" class="msg-edited">(édité)</span>
                      <span v-if="m.fromEmail === currentUserEmail" :class="['read-indicator', isMessageRead(m) ? 'read' : 'unread']">
                        {{ isMessageRead(m) ? '✓✓' : '✓' }}
                      </span>
                    </div>
                  </div>
                </div>

                <div v-if="getReactionGroups(m).length > 0" class="reactions">
                  <button v-for="[emoji, count] in getReactionGroups(m)" :key="emoji" class="reaction" @click="openReactionModal(m._id, emoji, $event)" :title="`Voir qui a réagi avec ${emoji}`">
                    {{ emoji }} <span class="reaction-count">{{ count }}</span>
                  </button>
                </div>

                <div class="msg-actions">
                  <button v-if="m.fromEmail === currentUserEmail && !m.isDeleted" class="msg-edit-btn" @click="startEdit(m)" title="Éditer">
                    ✏️
                  </button>
                  <button v-if="m.fromEmail === currentUserEmail && !m.isDeleted" class="msg-delete-btn" @click="handleDelete(m._id)" title="Supprimer">
                    🗑️
                  </button>
                  <button v-if="!m.isDeleted" class="msg-forward-btn" @click="openForwardPicker(m._id)" title="Transférer">
                    ↗️
                  </button>
                  <button v-if="isPrestataire" class="msg-pin-btn" @click="togglePin(m._id)" :title="m.isPinned ? 'Dépingler' : 'Épingler'">
                    {{ m.isPinned ? '📌' : '📍' }}
                  </button>
                  <button class="msg-react-btn" @click="reactionPickerMessageId = reactionPickerMessageId === m._id ? null : m._id">
                    +
                  </button>
                </div>

                <div v-if="reactionPickerMessageId === m._id" class="reaction-picker">
                  <button v-for="emoji in quickEmojis" :key="emoji" class="emoji-btn" @click="toggleReaction(m._id, emoji)">
                    {{ emoji }}
                  </button>
                </div>

                <div v-if="forwardingMessageId === m._id" class="forward-picker">
                  <div class="forward-header">Transférer vers:</div>
                  <div v-if="forwardLoading" class="forward-loading">
                    <div class="spinner" style="width: 16px; height: 16px;"></div>
                  </div>
                  <div v-else-if="forwardTargets.length === 0" class="forward-empty">
                    Aucune autre conversation
                  </div>
                  <button v-for="target in forwardTargets" :key="target._id" class="forward-target" @click="doForward(target._id)">
                    {{ target.displayName }}
                  </button>
                </div>
              </div>
            </template>

            <div v-if="isTyping" class="msg msg--client msg-typing">
              <div class="msg-bubble">
                <div class="typing-user">{{ typingUser?.name }} est en train d'écrire...</div>
                <div class="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          </div>

          <div class="compose">
            <div class="compose-typing" v-if="isTyping">
              <span class="typing-dot">●</span> {{ typingUser?.name }} est en train d'écrire...
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
.thread-list-header {
  display: flex; gap: 0.5rem; padding: 0.5rem 0.625rem 0.625rem;
  border-bottom: 1px solid #e9e5d6;
  flex-shrink: 0;
}
.archive-toggle {
  flex: 1; padding: 0.5rem 0.75rem;
  background: #f5f2eb; border: 1px solid #d6cda4;
  border-radius: 8px; font-size: 0.75rem; font-weight: 600;
  color: #7a6000; cursor: pointer;
  transition: all 0.15s;
}
.archive-toggle:hover { background: #eef2e8; border-color: #a8c47a; }
.archive-toggle.active {
  background: #3a5020; color: #fff; border-color: #3a5020;
}

.no-threads-msg {
  padding: 1.5rem 0.75rem; text-align: center;
  color: #9ca3af; font-size: 0.85rem;
}

.thread-actions {
  display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;
}
.archive-btn {
  width: 24px; height: 24px; padding: 0;
  background: transparent; border: none; cursor: pointer;
  font-size: 0.95rem; opacity: 0;
  transition: opacity 0.15s;
}
.thread-item:hover .archive-btn { opacity: 1; }

.thread-count {
  font-size: 0.7rem; font-weight: 700;
  background: #3a5020; color: #fff;
  padding: 0.1rem 0.45rem; border-radius: 999px;
}

/* Labels */
.label-filter {
  display: flex; flex-wrap: wrap; gap: 0.4rem;
  padding: 0.5rem 0.625rem 0.625rem;
  border-bottom: 1px solid #e9e5d6;
  flex-shrink: 0;
}
.label-filter-btn {
  padding: 0.35rem 0.65rem; background: #f5f2eb;
  border: 1px solid #d6cda4; border-radius: 6px;
  font-size: 0.7rem; font-weight: 600; color: #7a6000;
  cursor: pointer; transition: all 0.15s;
}
.label-filter-btn:hover { background: #eef2e8; border-color: #a8c47a; }
.label-filter-btn.active {
  background: #3a5020; color: #fff; border-color: #3a5020;
}

.label-btn {
  width: 24px; height: 24px; padding: 0;
  background: transparent; border: none; cursor: pointer;
  font-size: 0.95rem; opacity: 0;
  transition: opacity 0.15s;
}
.thread-item:hover .label-btn { opacity: 1; }

.thread-labels {
  display: flex; flex-wrap: wrap; gap: 0.3rem;
  margin-top: 0.2rem;
}
.thread-label {
  display: inline-block; padding: 0.15rem 0.4rem;
  background: rgba(168,196,122,0.15); color: #3a5020;
  border-radius: 3px; font-size: 0.65rem; font-weight: 600;
}

.label-modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.3); z-index: 1000;
  display: flex; align-items: center; justify-content: center;
}
.label-modal {
  background: #FCFAF5; border: 1.5px solid #e9e5d6;
  border-radius: 16px; width: 90%; max-width: 350px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}
.label-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.25rem; border-bottom: 1px solid #e9e5d6;
}
.label-modal-header h3 {
  font-size: 0.95rem; font-weight: 700; color: #1a1a0e; margin: 0;
}
.close-btn {
  background: none; border: none; cursor: pointer;
  font-size: 1.25rem; color: #9ca3af; padding: 0;
}
.label-modal-body {
  padding: 1rem 1.25rem;
}
.current-labels {
  margin-bottom: 1rem;
}
.no-labels {
  color: #9ca3af; font-size: 0.85rem; text-align: center;
  padding: 0.75rem 0;
}
.label-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.5rem 0.75rem; background: #f5f2eb;
  border-radius: 8px; margin-bottom: 0.5rem;
}
.label-name {
  font-size: 0.85rem; font-weight: 600; color: #3a5020;
}
.remove-label-btn {
  background: none; border: none; cursor: pointer;
  color: #9ca3af; font-size: 1rem; padding: 0;
  transition: color 0.15s;
}
.remove-label-btn:hover { color: #d32f2f; }

.add-label-input {
  display: flex; gap: 0.5rem;
}
.add-label-input input {
  flex: 1; padding: 0.5rem 0.75rem;
  border: 1.5px solid #d6cda4; border-radius: 8px;
  font-size: 0.85rem; font-family: inherit; color: #1a1a0e;
  background: #f5f2eb;
}
.add-label-input input:focus {
  outline: none; border-color: #3a5020;
}
.add-btn {
  padding: 0.5rem 1rem; background: #3a5020;
  color: #fff; border: none; border-radius: 8px;
  font-size: 0.85rem; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.add-btn:hover { background: #2d3a18; }

/* Reaction Modal */
.reaction-modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.3); z-index: 1000;
  display: flex; align-items: center; justify-content: center;
}
.reaction-modal {
  background: #FCFAF5; border: 1.5px solid #e9e5d6;
  border-radius: 16px; width: 90%; max-width: 400px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}
.reaction-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.25rem; border-bottom: 1px solid #e9e5d6;
}
.reaction-modal-header h3 {
  font-size: 0.95rem; font-weight: 700; color: #1a1a0e; margin: 0;
}
.reaction-modal-body {
  padding: 1rem 1.25rem; max-height: 400px; overflow-y: auto;
}
.no-reactions {
  color: #9ca3af; font-size: 0.85rem; text-align: center;
  padding: 1rem 0;
}
.reaction-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.75rem; background: #f5f2eb;
  border-radius: 8px; margin-bottom: 0.5rem;
}
.reactor-info {
  flex: 1; min-width: 0;
}
.reactor-name {
  font-size: 0.85rem; font-weight: 600; color: #1a1a0e;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.reactor-email {
  font-size: 0.75rem; color: #9ca3af;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.reaction-time {
  font-size: 0.7rem; color: #9ca3af; margin-left: 1rem; white-space: nowrap;
}

/* Edit History Modal */
.edit-history-modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.3); z-index: 1000;
  display: flex; align-items: center; justify-content: center;
}
.edit-history-modal {
  background: #FCFAF5; border: 1.5px solid #e9e5d6;
  border-radius: 16px; width: 90%; max-width: 500px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  max-height: 80vh; overflow: hidden;
  display: flex; flex-direction: column;
}
.edit-history-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.25rem; border-bottom: 1px solid #e9e5d6;
  flex-shrink: 0;
}
.edit-history-modal-header h3 {
  font-size: 0.95rem; font-weight: 700; color: #1a1a0e; margin: 0;
}
.edit-history-modal-body {
  padding: 1rem 1.25rem; overflow-y: auto; flex: 1;
}
.no-history {
  color: #9ca3af; font-size: 0.85rem; text-align: center;
  padding: 1rem 0;
}
.history-item {
  margin-bottom: 1.5rem; padding-bottom: 1rem;
  border-bottom: 1px solid #e9e5d6;
}
.history-item:last-of-type { border-bottom: none; }
.history-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 0.5rem;
}
.history-editor {
  font-size: 0.8rem; font-weight: 600; color: #3a5020;
}
.history-time {
  font-size: 0.7rem; color: #9ca3af;
}
.history-content {
  background: #f5f2eb; padding: 0.75rem;
  border-radius: 8px;
}
.content-label {
  font-size: 0.7rem; color: #9ca3af; font-weight: 600;
  text-transform: uppercase; margin-bottom: 0.3rem;
}
.content-text {
  font-size: 0.85rem; color: #1a1a0e;
  line-height: 1.4; white-space: pre-wrap;
  word-break: break-word;
}
.current-content-item {
  margin-top: 1.5rem; padding: 1rem;
  background: rgba(168,196,122,0.1); border: 1px solid rgba(168,196,122,0.3);
  border-radius: 8px;
}
.current-content-item .history-header {
  margin-bottom: 0.75rem;
}

.msg-edited {
  color: #7a6000; cursor: pointer; text-decoration: underline;
  transition: color 0.15s;
}
.msg-edited:hover { color: #3a5020; }

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

/* Search */
.thread-search {
  display: flex; gap: 0.5rem; align-items: center;
  padding: 0.75rem 1.25rem; border-bottom: 1px solid #e9e5d6;
  flex-shrink: 0;
}
.search-input {
  flex: 1; padding: 0.5rem 0.75rem;
  border: 1.5px solid #d6cda4; border-radius: 8px;
  font-size: 0.85rem; font-family: inherit; color: #1a1a0e;
  background: #f5f2eb;
  transition: border-color 0.15s;
}
.search-input:focus { outline: none; border-color: #515F37; }
.search-toggle {
  padding: 0.4rem 0.6rem; background: #f5f2eb;
  border: 1.5px solid #d6cda4; border-radius: 8px;
  cursor: pointer; font-size: 1rem; transition: all 0.15s;
  color: #515F37; font-weight: 600;
}
.search-toggle:hover { border-color: #a8c47a; background: #eef2e8; }

mark {
  background: rgba(230, 197, 83, 0.3);
  padding: 0.1rem 0.2rem;
  border-radius: 3px;
  font-weight: 600;
  color: inherit;
}

/* Pinned messages */
.pinned-messages {
  background: rgba(230, 197, 83, 0.08);
  border-left: 3px solid rgba(230, 197, 83, 0.5);
  padding: 0.75rem 1rem;
  margin: 0.5rem 1.25rem;
  border-radius: 8px;
}
.pinned-header {
  font-size: 0.75rem; font-weight: 700;
  color: #7a6000; text-transform: uppercase;
  letter-spacing: 0.05em; margin-bottom: 0.5rem;
}
.pinned-msg {
  background: #FCFAF5; border: 1px solid rgba(230, 197, 83, 0.3);
  padding: 0.6rem 0.75rem; border-radius: 8px;
  margin-bottom: 0.4rem; position: relative;
}
.pinned-content {
  font-size: 0.85rem; color: #1a1a0e;
  line-height: 1.4; white-space: pre-wrap;
}
.pinned-meta {
  font-size: 0.7rem; color: #9ca3af; margin-top: 0.35rem;
}
.unpin-btn {
  position: absolute; top: 0.5rem; right: 0.5rem;
  background: none; border: none; cursor: pointer;
  font-size: 0.85rem; color: #7a6000;
  opacity: 0.7; transition: opacity 0.15s;
  font-weight: 600;
}
.unpin-btn:hover { opacity: 1; }

.msg-actions {
  display: flex; gap: 0.35rem; align-items: center;
}
.msg-pin-btn {
  width: 28px; height: 28px;
  background: #f0ede3; border: 1px solid #d6cda4;
  border-radius: 50%; color: #7a6000;
  cursor: pointer; font-size: 1rem;
  transition: background 0.15s, border-color 0.15s;
  line-height: 1;
  display: flex; align-items: center; justify-content: center;
}
.msg-pin-btn:hover { background: #e8dfd3; border-color: #a8c47a; }

.msg-edit-btn, .msg-delete-btn, .msg-forward-btn {
  width: 28px; height: 28px;
  background: #f0ede3; border: 1px solid #d6cda4;
  border-radius: 50%; color: #515F37;
  cursor: pointer; font-size: 1rem;
  transition: background 0.15s, border-color 0.15s;
  line-height: 1;
  display: flex; align-items: center; justify-content: center;
}
.msg-edit-btn:hover, .msg-delete-btn:hover, .msg-forward-btn:hover { background: #e8dfd3; border-color: #a8c47a; }

.msg--deleted { opacity: 0.6; }
.msg-edited { font-size: 0.65rem; color: #9ca3af; margin-left: 0.25rem; }

/* Edit form */
.msg-edit-form {
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background: #f5f2eb;
  border-radius: 12px;
  border: 1.5px solid #d6cda4;
}
.edit-textarea {
  width: 100%; padding: 0.6rem 0.75rem;
  border: 1.5px solid #d6cda4; border-radius: 8px;
  font-size: 0.9rem; font-family: inherit; color: #1a1a0e;
  background: #FCFAF5; resize: none;
  margin-bottom: 0.5rem;
}
.edit-textarea:focus { outline: none; border-color: #515F37; }
.edit-actions { display: flex; gap: 0.5rem; }
.btn-save-edit {
  padding: 0.4rem 1rem; background: #3a5020; color: #fff;
  border: none; border-radius: 8px; cursor: pointer;
  font-weight: 700; font-size: 0.8rem; font-family: inherit;
  transition: background 0.15s;
}
.btn-save-edit:hover { background: #253515; }
.btn-cancel-edit {
  padding: 0.4rem 0.875rem; background: none; color: #9ca3af;
  border: 1.5px solid #e9e5d6; border-radius: 8px;
  cursor: pointer; font-size: 0.8rem; font-family: inherit;
  transition: all 0.15s;
}
.btn-cancel-edit:hover { border-color: #d6cda4; color: #515F37; }

.messages-list {
  flex: 1; overflow-y: auto;
  display: flex; flex-direction: column; gap: 0.75rem;
  padding: 1.25rem;
}

.msg-wrapper {
  display: flex;
  position: relative;
  margin-bottom: 0.25rem;
}
.msg-wrapper--provider { justify-content: flex-end; }
.msg-wrapper--client { justify-content: flex-start; }

.msg { display: flex; flex: 1; }
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
.msg-meta { font-size: 0.7rem; margin-top: 0.35rem; opacity: 0.6; display: flex; align-items: center; gap: 0.35rem; }

.read-indicator {
  display: inline-flex;
  align-items: center;
  font-size: 0.65rem;
  margin-left: 0.25rem;
  font-weight: 700;
}
.read-indicator.read { color: currentColor; opacity: 0.8; }
.read-indicator.unread { opacity: 0.5; }

/* Reactions */
.reactions {
  display: flex; gap: 0.35rem; margin-top: 0.35rem; flex-wrap: wrap;
  padding: 0 0.75rem;
}
.reaction {
  display: inline-flex; align-items: center; gap: 0.2rem;
  background: #f0ede3; border: 1px solid #d6cda4;
  padding: 0.15rem 0.4rem; border-radius: 12px;
  font-size: 0.85rem; cursor: pointer; font-family: inherit;
  transition: background 0.15s, border-color 0.15s;
}
.reaction:hover { background: #e8dfd3; border-color: #a8c47a; }
.reaction:active { transform: scale(0.95); }
.reaction-count { font-size: 0.7rem; color: #9ca3af; font-weight: 600; }

.msg-react-btn {
  width: 28px; height: 28px;
  background: #f0ede3; border: 1px solid #d6cda4;
  border-radius: 50%; color: #515F37;
  cursor: pointer; font-weight: 700; font-size: 1.1rem;
  transition: background 0.15s, border-color 0.15s;
  line-height: 1;
  display: flex; align-items: center; justify-content: center;
}
.msg-react-btn:hover { background: #e8dfd3; border-color: #a8c47a; }

.reaction-picker {
  position: absolute;
  bottom: 2rem; right: 0;
  background: #FCFAF5; border: 1.5px solid #d6cda4;
  border-radius: 12px; padding: 0.5rem;
  display: flex; gap: 0.3rem; flex-wrap: wrap;
  z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.emoji-btn {
  background: none; border: none; font-size: 1.5rem;
  cursor: pointer; padding: 0.25rem;
  transition: transform 0.15s;
}
.emoji-btn:hover { transform: scale(1.2); }

/* Forward picker */
.forward-picker {
  position: absolute;
  bottom: 2rem; right: 0;
  background: #FCFAF5; border: 1.5px solid #d6cda4;
  border-radius: 12px; padding: 0.5rem;
  z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  min-width: 180px;
}
.forward-header {
  font-size: 0.75rem; font-weight: 700;
  color: #9ca3af; padding: 0.35rem 0.5rem;
  border-bottom: 1px solid #e9e5d6; margin-bottom: 0.35rem;
}
.forward-loading {
  display: flex; justify-content: center; padding: 0.5rem;
}
.forward-empty {
  font-size: 0.8rem; color: #9ca3af;
  padding: 0.5rem; text-align: center;
}
.forward-target {
  display: block; width: 100%;
  padding: 0.4rem 0.5rem; margin-bottom: 0.25rem;
  background: #f5f2eb; border: 1px solid #e9e5d6;
  border-radius: 8px; cursor: pointer;
  font-size: 0.8rem; color: #515F37;
  text-align: left; font-family: inherit;
  transition: background 0.15s, border-color 0.15s;
}
.forward-target:hover { background: #eef2e8; border-color: #a8c47a; }

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
.typing-user {
  font-size: 0.85rem; color: #1a1a0e; margin-bottom: 0.3rem;
  font-weight: 500;
}

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
