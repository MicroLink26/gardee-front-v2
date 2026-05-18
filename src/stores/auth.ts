import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as authService from '../services/auth';
import { setAccessToken } from '../services/api';
import type { User } from '../types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(null);

  const isLoggedIn = computed(() => !!accessToken.value);
  const isPrestataire = computed(() => user.value?.role === 'prestataire');
  const isStaff = computed(() => user.value?.role === 'staff' || user.value?.role === 'admin');
  const isAdmin = computed(() => user.value?.role === 'admin');

  async function login(email: string, password: string) {
    const res = await authService.login(email, password);
    accessToken.value = res.accessToken;
    user.value = res.user;
    setAccessToken(res.accessToken);
  }

  async function logout() {
    await authService.logout().catch(() => {});
    accessToken.value = null;
    user.value = null;
    setAccessToken(null);
  }

  async function tryRefresh(): Promise<boolean> {
    try {
      const token = await authService.refresh();
      accessToken.value = token;
      setAccessToken(token);
      user.value = await authService.getMe();
      return true;
    } catch {
      accessToken.value = null;
      user.value = null;
      setAccessToken(null);
      return false;
    }
  }

  async function fetchMe() {
    if (!accessToken.value) return;
    setAccessToken(accessToken.value);
    try {
      user.value = await authService.getMe();
    } catch {
      await tryRefresh();
    }
  }

  return { user, accessToken, isLoggedIn, isPrestataire, isStaff, isAdmin, login, logout, tryRefresh, fetchMe };
}, {
  persist: { pick: ['accessToken'] },
});
