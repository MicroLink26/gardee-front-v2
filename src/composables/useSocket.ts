import { ref, onBeforeUnmount } from 'vue';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth';

interface TypingUser {
  userId: string;
  email: string;
  name: string;
}

let socket: Socket | null = null;
const connected = ref(false);
const typingUsers = ref<TypingUser[]>([]);

export function useSocket() {
  const auth = useAuthStore();

  const connect = () => {
    if (socket && socket.connected) return;

    const apiUrl = import.meta.env.PUBLIC_API_URL || 'https://site--gardee-backend--fg6zdpvl2w9z.code.run/api';
    const wsUrl = apiUrl.replace('/api', '').replace('http', 'ws');

    socket = io(wsUrl, {
      auth: {
        token: auth.accessToken,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      connected.value = true;
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      connected.value = false;
      console.log('Socket disconnected');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      socket = null;
      connected.value = false;
    }
  };

  const joinThread = (threadId: string) => {
    if (!socket) connect();
    socket?.emit('join-thread', threadId);
  };

  const leaveThread = (threadId: string) => {
    socket?.emit('leave-thread', threadId);
    typingUsers.value = [];
  };

  const sendMessage = (threadId: string, message: any) => {
    socket?.emit('new-message', { threadId, message });
  };

  const notifyTyping = (threadId: string) => {
    socket?.emit('typing', { threadId });
  };

  const stopTyping = (threadId: string) => {
    socket?.emit('stop-typing', { threadId });
  };

  const markAsRead = (threadId: string, messageIds: string[]) => {
    socket?.emit('mark-read', { threadId, messageIds });
  };

  const onMessageReceived = (callback: (message: any) => void) => {
    socket?.on('message-received', callback);
  };

  const onUserTyping = (callback: (data: { threadId: string; typingUsers: TypingUser[] }) => void) => {
    socket?.on('user-typing', (data) => {
      typingUsers.value = data.typingUsers;
      callback(data);
    });
  };

  const onMessagesRead = (callback: (data: any) => void) => {
    socket?.on('messages-read', callback);
  };

  const offMessageReceived = () => {
    socket?.off('message-received');
  };

  const offUserTyping = () => {
    socket?.off('user-typing');
  };

  const offMessagesRead = () => {
    socket?.off('messages-read');
  };

  onBeforeUnmount(() => {
    offMessageReceived();
    offUserTyping();
    offMessagesRead();
  });

  return {
    connected,
    typingUsers,
    connect,
    disconnect,
    joinThread,
    leaveThread,
    sendMessage,
    notifyTyping,
    stopTyping,
    markAsRead,
    onMessageReceived,
    onUserTyping,
    onMessagesRead,
    offMessageReceived,
    offUserTyping,
    offMessagesRead,
  };
}
