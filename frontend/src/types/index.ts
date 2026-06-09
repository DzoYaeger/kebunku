// Padanan TypeScript untuk payload API Laravel (key snake_case sesuai API Resource).

export interface User {
  id: number;
  name: string;
  username: string | null;
  email: string;
  role: 'admin' | 'pekerja' | 'viewer';
  team_owner_id: number | null;
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
  icon: string | null;
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
  jadwal_pupuk?: { tanggal: string; jenis: string } | null;
  jadwal_pestisida?: { tanggal: string; jenis: string } | null;
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

// Panen
export interface Panen {
  id: number | null;
  client_uuid: string;
  lahan_id: number;
  lahan?: Lahan;
  tanggal: string;
  berat: string;
  grade: string | null;
  harga_jual: string | null;
  total?: string | null;
  pembeli: string | null;
  catatan: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PanenMeta {
  total_panen: number;
  total_berat: string;
  total_pendapatan: string;
}

export interface ProfitKomoditas {
  komoditas: string;
  total_berat: number;
  total_pendapatan: number;
  total_biaya: number;
  profit: number;
  margin: number;
}

// Musim Tanam
export type MusimStatus = 'aktif' | 'selesai' | 'gagal';

export interface MusimTanam {
  id: number | null;
  client_uuid: string;
  lahan_id: number;
  lahan?: Lahan;
  komoditas: string;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  status: MusimStatus;
  catatan: string | null;
  created_at?: string;
  updated_at?: string;
}

// Dashboard
export interface DashboardData {
  lahan_aktif: number;
  top_komoditas: string | null;
  top_komoditas_count: number;
  biaya_bulan_ini: number;
  pendapatan_bulan_ini: number;
  berat_panen_bulan_ini: number;
  laba_total_estimasi: number;
}

// Care Plan
export interface CarePlanScheduleItem {
  minggu: number;
  tanggal: string;
  aktivitas: string;
  detail: string;
  kocor?: string | null;
  benam?: string | null;
  catatan?: string;
}

export interface CarePlan {
  id: number;
  user_id: number;
  lahan_id: number;
  schedule: CarePlanScheduleItem[];
  summary: string;
  status: 'active' | 'completed' | 'superseded';
  completed_items: number[] | null;
  lahan?: { id: number; nomor_bed: string; komoditas: string };
  created_at: string;
  updated_at: string;
}

// Plant Feedback
export interface PlantFeedback {
  id: number;
  tipe: 'progress' | 'keluhan';
  content: string;
  ai_response: string | null;
  image_url: string | null;
  created_at: string;
}
