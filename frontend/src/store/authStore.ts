import { create } from 'zustand';
import { api } from '../api/client';
import { getToken, setToken } from '../api/token';
import { clearLocalData } from '../db';
import type { ApiResource, AuthPayload, User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  // 'unknown' = belum dicek; 'authenticated' / 'guest' setelah cek.
  status: 'unknown' | 'authenticated' | 'guest';
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  loadMe: () => Promise<void>;
  updateProfile: (name: string, username: string, email: string) => Promise<void>;
  updatePassword: (currentPassword: string, password: string, passwordConfirmation: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: getToken(),
  status: 'unknown',
  loading: false,

  login: async (login, password) => {
    set({ loading: true });
    try {
      const res = await api.post<ApiResource<AuthPayload>>('/auth/login', { login, password });
      setToken(res.data.data.token);
      set({
        user: res.data.data.user,
        token: res.data.data.token,
        status: 'authenticated',
      });
    } finally {
      set({ loading: false });
    }
  },

  register: async (name, email, password, passwordConfirmation) => {
    set({ loading: true });
    try {
      const res = await api.post<ApiResource<AuthPayload>>('/auth/register', {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      setToken(res.data.data.token);
      set({
        user: res.data.data.user,
        token: res.data.data.token,
        status: 'authenticated',
      });
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Abaikan error logout (mis. offline / token sudah invalid).
    }
    setToken(null);
    await clearLocalData();
    set({ user: null, token: null, status: 'guest' });
  },

  loadMe: async () => {
    const token = getToken();
    if (!token) {
      set({ status: 'guest' });
      return;
    }
    try {
      const res = await api.get<ApiResource<User>>('/auth/me');
      set({ user: res.data.data, token, status: 'authenticated' });
    } catch {
      // Token invalid / offline. Jika ada token tersimpan, pertahankan sesi optimistik
      // agar app tetap bisa dipakai offline; interceptor 401 sudah menghapus token bila ditolak.
      if (getToken()) {
        set({ token, status: 'authenticated' });
      } else {
        set({ status: 'guest' });
      }
    }
  },

  updateProfile: async (name, username, email) => {
    const res = await api.put<ApiResource<User>>('/auth/profile', {
      name,
      username: username || null,
      email,
    });
    set({ user: res.data.data });
  },

  updatePassword: async (currentPassword, password, passwordConfirmation) => {
    await api.put('/auth/password', {
      current_password: currentPassword,
      password,
      password_confirmation: passwordConfirmation,
    });
  },
}));
