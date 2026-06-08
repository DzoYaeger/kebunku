// Padanan TypeScript untuk payload API Laravel (key snake_case sesuai API Resource).

export interface User {
  id: number;
  name: string;
  username: string | null;
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

// Perawatan
export interface PerawatanRiwayatItem {
  tanggal: string;
  jenis_pupuk?: string | null;
  jenis_pestisida?: string | null;
  catatan: string | null;
}

export interface PerawatanLahan {
  lahan_id: number;
  nomor_bed: string;
  komoditas: string;
  status: LahanStatus;
  terakhir_dipupuk: { tanggal: string; jenis_pupuk: string | null } | null;
  terakhir_dipestisida: { tanggal: string; jenis_pestisida: string | null } | null;
  riwayat_pemupukan: PerawatanRiwayatItem[];
  riwayat_pestisida: PerawatanRiwayatItem[];
}

export interface SaranAiResponse {
  lahan_id: number;
  komoditas: string;
  nomor_bed: string;
  saran: string;
}

// Cuaca & Saran Harian
export interface CuacaData {
  suhu: number | null;
  kelembaban: number | null;
  angin: number | null;
  kode_cuaca: number;
  deskripsi: string;
  akan_hujan: boolean;
  probabilitas_hujan: number;
  prakiraan_3_hari: PrakiraanHari[];
}

export interface PrakiraanHari {
  tanggal: string;
  suhu_max: number | null;
  suhu_min: number | null;
  curah_hujan: number;
  prob_hujan: number;
  deskripsi: string;
}

export interface SaranHarianResponse {
  cuaca: CuacaData;
  saran: string;
}

// Chat AI
export interface ChatMessage {
  id: number;
  chat_session_id: number;
  role: 'user' | 'assistant';
  content: string;
  image_url: string | null;
  created_at: string;
}

export interface ChatSessionLahan {
  id: number;
  nomor_bed: string;
  komoditas: string;
}

export interface ChatSession {
  id: number;
  judul: string;
  lahan_id: number | null;
  lahan?: ChatSessionLahan | null;
  messages?: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface SendMessageResponse {
  user_message: ChatMessage;
  assistant_message: ChatMessage;
}