// Padanan TypeScript untuk payload API Laravel (key snake_case sesuai API Resource).

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface AuthPayload {
  user: User;
  token: string;
}

export type LahanStatus = 'semai' | 'aktif' | 'selesai';

export interface Lahan {
  id: number | null;
  client_uuid: string;
  nomor_bed: string;
  komoditas: string;
  status: LahanStatus;
  tanggal_tanam: string | null;
  catatan: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type AktivitasTipe = 'semai' | 'pindah_tanam' | 'pemupukan' | 'pestisida';

export interface Aktivitas {
  id: number | null;
  client_uuid: string;
  lahan_id: number | string;
  tipe: AktivitasTipe;
  tanggal: string;
  jenis_pupuk: string | null;
  jenis_pestisida: string | null;
  catatan: string | null;
  lahan?: Lahan;
  created_at: string | null;
  updated_at: string | null;
}

export type TransaksiTipe = 'kas_keluar' | 'kas_masuk';

export interface Transaksi {
  id: number | null;
  client_uuid: string;
  tipe: TransaksiTipe;
  kategori: string;
  komoditas: string | null;
  nominal: string;
  tanggal: string;
  lahan_id: number | string | null;
  catatan: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TransaksiMeta {
  total_kas_keluar: string;
  total_kas_masuk: string;
  saldo: string;
}

export interface RingkasanKomoditas {
  komoditas: string;
  total: number;
  jumlah_transaksi: number;
}

// Bentuk respons API
export interface ApiResource<T> {
  data: T;
}

export interface ApiCollection<T, M = unknown> {
  data: T[];
  meta?: M;
}

export interface ApiValidationError {
  message: string;
  errors: Record<string, string[]>;
}
