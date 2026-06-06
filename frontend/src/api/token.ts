// Penyimpanan token Sanctum yang konsisten (in-memory + localStorage).
// Dipakai bersama oleh axios client dan authStore tanpa circular import.

const STORAGE_KEY = 'kebunku.token';

let currentToken: string | null = localStorage.getItem(STORAGE_KEY);

export function getToken(): string | null {
  return currentToken;
}

export function setToken(token: string | null): void {
  currentToken = token;
  if (token) {
    localStorage.setItem(STORAGE_KEY, token);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// Event yang dipancarkan saat server menolak token (401) agar store bisa logout.
export const UNAUTHORIZED_EVENT = 'kebunku:unauthorized';
