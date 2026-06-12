<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getThreadByToken, replyByToken, type Message } from '../../services/requests';

const token = ref('');
const messages = ref<Message[]>([]);
const prestataireName = ref('');
const clientEmail = ref('');
const newMessage = ref('');
const sending = ref(false);
const sent = ref(false);
const error = ref('');
const loading = ref(true);
const invalid = ref(false);
const currentToken = ref('');

onMounted(async () => {
  token.value = new URLSearchParams(window.location.search).get('token') ?? '';
  currentToken.value = token.value;
  if (!token.value) { invalid.value = true; loading.value = false; return; }
  try {
    const res = await getThreadByToken(token.value);
    messages.value = res.messages;
    prestataireName.value = res.prestataireName;
    clientEmail.value = res.clientEmail ?? '';
  } catch {
    invalid.value = true;
  } finally {
    loading.value = false;
  }
});

async function send() {
  if (!newMessage.value.trim()) return;
  sending.value = true;
  error.value = '';
  try {
    const content = newMessage.value.trim();
    newMessage.value = '';
    const res = await replyByToken(currentToken.value, content);
    currentToken.value = res.newToken;
    messages.value.push({
      _id: Date.now().toString(),
      fromRole: 'client',
      fromEmail: '',
      fromName: 'Vous',
      content,
      createdAt: new Date().toISOString(),
    });
    sent.value = true;
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    error.value = err.response?.data?.error || 'Impossible d\'envoyer. Le lien a peut-etre expire.';
  } finally {
    sending.value = false;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <div class="reply-page">
    <div class="card">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span>Messagerie Gardee</span>
      </div>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        Chargement...
      </div>

      <div v-else-if="invalid" class="invalid">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="40" height="40"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <h2>Lien invalide ou expiré</h2>
        <p>Ce lien de reponse n'est plus valable. Contactez directement votre prestataire.</p>
        <a href="https://gardee.fr" class="btn-home">Retour a Gardee</a>
      </div>

      <template v-else>
        <div class="thread-title">Conversation avec <strong>{{ prestataireName }}</strong></div>

        <div class="messages-list">
          <div
            v-for="m in messages"
            :key="m._id"
            :class="['msg', m.fromRole === 'client' ? 'msg--client' : 'msg--provider']"
          >
            <div class="msg-bubble">
              <div class="msg-content">{{ m.content }}</div>
              <div class="msg-meta">{{ m.fromName }} · {{ formatDate(m.createdAt) }}</div>
            </div>
          </div>
        </div>

        <div v-if="sent" class="sent-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
          Message envoye ! Votre prestataire en a ete informe par email.
        </div>

        <div class="compose">
          <textarea v-model="newMessage" rows="4" maxlength="5000" placeholder="Votre reponse..."></textarea>
          <p v-if="error" class="error-msg">{{ error }}</p>
          <div class="compose-row">
            <div class="account-hint">
              Accédez à toutes vos demandes depuis votre espace :
              <a :href="`/app/login${clientEmail ? '?email=' + encodeURIComponent(clientEmail) : ''}`">Se connecter</a>
              ou
              <a :href="`/app/register${clientEmail ? '?email=' + encodeURIComponent(clientEmail) : ''}`">Créer un compte</a>
            </div>
            <button class="btn-send" :disabled="sending || !newMessage.trim()" @click="send">
              {{ sending ? 'Envoi...' : 'Repondre' }}
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.reply-page {
  min-height: 100vh; background: #f2efe6;
  display: flex; align-items: flex-start; justify-content: center;
  padding: 3rem 1rem;
}

.card {
  background: #FCFAF5; border: 1.5px solid #e9e5d6; border-radius: 20px;
  padding: 2rem; width: 100%; max-width: 640px;
  display: flex; flex-direction: column; gap: 1.25rem;
  box-shadow: 0 8px 32px rgba(0,0,0,0.06);
}

.logo { display: flex; align-items: center; gap: 0.625rem; color: #3a5020; font-weight: 800; font-size: 1rem; }

.loading { display: flex; align-items: center; gap: 0.75rem; color: #9ca3af; font-size: 0.875rem; padding: 1rem 0; }
.spinner { width: 20px; height: 20px; border: 2px solid #e9e5d6; border-top-color: #3a5020; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.invalid { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; text-align: center; padding: 2rem 0; color: #374151; }
.invalid h2 { font-size: 1.2rem; font-weight: 800; color: #1a1a0e; margin: 0; }
.invalid p { font-size: 0.875rem; color: #9ca3af; margin: 0; }
.btn-home {
  display: inline-block; padding: 0.6rem 1.5rem;
  background: #3a5020; color: #fff; text-decoration: none;
  border-radius: 8px; font-weight: 700; font-size: 0.875rem; margin-top: 0.5rem;
}

.thread-title { font-size: 0.875rem; color: #6b7280; padding-bottom: 0.875rem; border-bottom: 1px solid #e9e5d6; }

.messages-list { display: flex; flex-direction: column; gap: 0.625rem; max-height: 360px; overflow-y: auto; }

.msg { display: flex; }
.msg--client { justify-content: flex-end; }
.msg--provider { justify-content: flex-start; }

.msg-bubble { max-width: 75%; padding: 0.75rem 1rem; border-radius: 16px; }
.msg--client .msg-bubble { background: #3a5020; color: #fff; border-bottom-right-radius: 4px; }
.msg--provider .msg-bubble { background: #f0ede3; color: #1a1a0e; border-bottom-left-radius: 4px; border: 1px solid #e4e0d0; }
.msg-content { font-size: 0.9rem; line-height: 1.55; white-space: pre-wrap; }
.msg-meta { font-size: 0.7rem; margin-top: 0.35rem; opacity: 0.6; }

.sent-banner {
  display: flex; align-items: center; gap: 0.5rem;
  background: #f0ede3; color: #515F37;
  padding: 0.75rem 1rem; border-radius: 8px;
  font-size: 0.875rem; font-weight: 600;
  border: 1px solid #d6cda4;
}

.compose { display: flex; flex-direction: column; gap: 0.625rem; }
.compose textarea {
  width: 100%; padding: 0.75rem 0.875rem;
  border: 1.5px solid #e9e5d6; border-radius: 10px;
  font-size: 0.9rem; font-family: inherit; color: #1a1a0e;
  background: #f5f2eb; resize: vertical;
  transition: border-color 0.15s, background 0.15s;
}
.compose textarea:focus { outline: none; border-color: #515F37; background: #FCFAF5; }

.compose-row { display: flex; align-items: center; gap: 1rem; justify-content: space-between; }
.account-hint { font-size: 0.75rem; color: #9ca3af; }
.account-hint a { color: #3a5020; text-decoration: underline; }
.error-msg { color: #ef4444; font-size: 0.8rem; margin: 0; }

.btn-send {
  padding: 0.6rem 1.5rem; background: #3a5020; color: #fff;
  border: none; border-radius: 8px; cursor: pointer;
  font-weight: 700; font-size: 0.9rem; font-family: inherit;
  transition: background 0.15s; flex-shrink: 0;
}
.btn-send:hover:not(:disabled) { background: #253515; }
.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
