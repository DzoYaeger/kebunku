import axios, { AxiosError } from 'axios';
import { getToken, setToken, UNAUTHORIZED_EVENT } from './token';

// Base URL: gunakan VITE_API_URL bila ada, default proxy '/api' (lihat vite.config.ts).
const baseURL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({
  baseURL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Tempelkan Bearer token pada setiap request.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Tangani 401: cabut token lokal & beri tahu app untuk logout.
// Skip untuk endpoint login/register — 401 di situ berarti kredensial salah, bukan sesi expired.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = error.config?.url ?? '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      setToken(null);
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  },
);

// Helper: deteksi error validasi server (422) — bukan error jaringan.
export function isValidationError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 422;
}

// Helper: deteksi error kredensial salah (401) dari endpoint login.
export function isCredentialsError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

// Helper: deteksi kegagalan jaringan (tidak ada response dari server).
export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}
