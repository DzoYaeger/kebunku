import Dexie, { type Table } from 'dexie';
import type { LahanStatus, AktivitasTipe, TransaksiTipe } from '../types';

// Record lokal (IndexedDB) selaras dengan tabel MariaDB.
// Dikunci oleh client_uuid; server_id diisi setelah sync sukses; _dirty = belum tersinkron.

export interface LahanLocal {
  client_uuid: string;
  server_id: number | null;
  nomor_bed: string;
  komoditas: string;
  status: LahanStatus;
  catatan: string | null;
  created_at: string;
  updated_at: string;
  _dirty: 0 | 1;
}

export interface AktivitasLocal {
  client_uuid: string;
  server_id: number | null;
  // Relasi ke lahan via client_uuid lokal (agar tetap valid sebelum lahan tersinkron).
  lahan_uuid: string;
  // server_id lahan bila sudah diketahui (untuk payload ke server).
  lahan_server_id: number | null;
  tipe: AktivitasTipe;
  tanggal: string;
  jenis_pupuk: string | null;
  jenis_pestisida: string | null;
  catatan: string | null;
  created_at: string;
  updated_at: string;
  _dirty: 0 | 1;
}

export interface TransaksiLocal {
  client_uuid: string;
  server_id: number | null;
  tipe: TransaksiTipe;
  kategori: string;
  nominal: string;
  tanggal: string;
  lahan_uuid: string | null;
  lahan_server_id: number | null;
  catatan: string | null;
  created_at: string;
  updated_at: string;
  _dirty: 0 | 1;
}

export type SyncEntity = 'lahan' | 'aktivitas' | 'transaksi';
export type SyncOp = 'create' | 'update' | 'delete';
export type SyncStatus = 'pending' | 'failed';

export interface SyncItem {
  id?: number;
  entity: SyncEntity;
  op: SyncOp;
  client_uuid: string;
  payload: Record<string, unknown>;
  status: SyncStatus;
  attempts: number;
  last_error: string | null;
  created_at: string;
}

class KebunkuDB extends Dexie {
  lahan!: Table<LahanLocal, string>;
  aktivitas!: Table<AktivitasLocal, string>;
  transaksi!: Table<TransaksiLocal, string>;
  sync_queue!: Table<SyncItem, number>;

  constructor() {
    super('kebunku');
    this.version(1).stores({
      lahan: 'client_uuid, server_id, status, _dirty',
      aktivitas: 'client_uuid, server_id, lahan_uuid, tanggal, _dirty',
      transaksi: 'client_uuid, server_id, tanggal, _dirty',
      sync_queue: '++id, entity, op, client_uuid, status, created_at',
    });
  }
}

export const db = new KebunkuDB();

// Kosongkan seluruh data lokal (mis. saat logout) agar tidak bocor antar akun.
export async function clearLocalData(): Promise<void> {
  await Promise.all([
    db.lahan.clear(),
    db.aktivitas.clear(),
    db.transaksi.clear(),
    db.sync_queue.clear(),
  ]);
}
