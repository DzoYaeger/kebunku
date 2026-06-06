import {
  db,
  type LahanLocal,
  type AktivitasLocal,
  type TransaksiLocal,
} from './index';
import { newClientUuid, nowIso } from './uuid';
import type { LahanStatus, AktivitasTipe, TransaksiTipe } from '../types';

// Repository = satu titik mutasi per domain.
// Pola: tulis salinan lokal (_dirty=1) + antrekan ke sync_queue. UI selalu baca dari Dexie.
// SyncEngine yang mengirim antrean ke server (idempoten via client_uuid).

async function enqueue(
  entity: 'lahan' | 'aktivitas' | 'transaksi',
  op: 'create' | 'update' | 'delete',
  client_uuid: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await db.sync_queue.add({
    entity,
    op,
    client_uuid,
    payload,
    status: 'pending',
    attempts: 0,
    last_error: null,
    created_at: nowIso(),
  });
}

/* ----------------------------- LAHAN ----------------------------- */

export interface LahanInput {
  nomor_bed: string;
  komoditas: string;
  status?: LahanStatus;
  catatan?: string | null;
}

export const lahanRepo = {
  async list(): Promise<LahanLocal[]> {
    const rows = await db.lahan.toArray();
    return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  // Daftar jenis tanaman (komoditas) unik yang sudah ada — untuk saran input.
  async komoditasList(): Promise<string[]> {
    const rows = await db.lahan.toArray();
    const set = new Map<string, string>(); // lower -> original
    for (const r of rows) {
      const key = r.komoditas.trim().toLowerCase();
      if (key && !set.has(key)) set.set(key, r.komoditas.trim());
    }
    return [...set.values()].sort((a, b) => a.localeCompare(b, 'id'));
  },

  async get(clientUuid: string): Promise<LahanLocal | undefined> {
    return db.lahan.get(clientUuid);
  },

  async create(input: LahanInput): Promise<LahanLocal> {
    const ts = nowIso();
    const record: LahanLocal = {
      client_uuid: newClientUuid(),
      server_id: null,
      nomor_bed: input.nomor_bed,
      komoditas: input.komoditas,
      status: input.status ?? 'semai',
      catatan: input.catatan ?? null,
      created_at: ts,
      updated_at: ts,
      _dirty: 1,
    };
    await db.lahan.put(record);
    await enqueue('lahan', 'create', record.client_uuid, {
      client_uuid: record.client_uuid,
      nomor_bed: record.nomor_bed,
      komoditas: record.komoditas,
      status: record.status,
      catatan: record.catatan,
    });
    return record;
  },

  async update(clientUuid: string, input: LahanInput): Promise<LahanLocal> {
    const existing = await db.lahan.get(clientUuid);
    if (!existing) throw new Error('Lahan tidak ditemukan');
    const updated: LahanLocal = {
      ...existing,
      nomor_bed: input.nomor_bed,
      komoditas: input.komoditas,
      status: input.status ?? existing.status,
      catatan: input.catatan ?? null,
      updated_at: nowIso(),
      _dirty: 1,
    };
    await db.lahan.put(updated);
    // Update hanya dikirim bila record sudah punya server_id.
    if (updated.server_id) {
      await enqueue('lahan', 'update', clientUuid, {
        server_id: updated.server_id,
        nomor_bed: updated.nomor_bed,
        komoditas: updated.komoditas,
        status: updated.status,
        catatan: updated.catatan,
      });
    }
    return updated;
  },

  async remove(clientUuid: string): Promise<void> {
    const existing = await db.lahan.get(clientUuid);
    await db.lahan.delete(clientUuid);
    if (existing?.server_id) {
      await enqueue('lahan', 'delete', clientUuid, { server_id: existing.server_id });
    }
  },
};

/* --------------------------- AKTIVITAS --------------------------- */

export interface AktivitasInput {
  lahan_uuid: string;
  tipe: AktivitasTipe;
  tanggal: string;
  jenis_pupuk?: string | null;
  jenis_pestisida?: string | null;
  catatan?: string | null;
}

export const aktivitasRepo = {
  async list(): Promise<AktivitasLocal[]> {
    const rows = await db.aktivitas.toArray();
    return rows.sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.created_at.localeCompare(a.created_at));
  },

  // Aktivitas untuk satu tanaman (berdasarkan lahan_uuid lokal), terbaru dulu.
  async listByLahan(lahanUuid: string): Promise<AktivitasLocal[]> {
    const rows = await db.aktivitas.where('lahan_uuid').equals(lahanUuid).toArray();
    return rows.sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.created_at.localeCompare(a.created_at));
  },

  async create(input: AktivitasInput): Promise<AktivitasLocal> {
    const ts = nowIso();
    const lahan = await db.lahan.get(input.lahan_uuid);
    const record: AktivitasLocal = {
      client_uuid: newClientUuid(),
      server_id: null,
      lahan_uuid: input.lahan_uuid,
      lahan_server_id: lahan?.server_id ?? null,
      tipe: input.tipe,
      tanggal: input.tanggal,
      jenis_pupuk: input.jenis_pupuk ?? null,
      jenis_pestisida: input.jenis_pestisida ?? null,
      catatan: input.catatan ?? null,
      created_at: ts,
      updated_at: ts,
      _dirty: 1,
    };
    await db.aktivitas.put(record);

    // Pindah tanam memperbarui status lahan lokal jadi 'aktif' (cermin perilaku server).
    if (record.tipe === 'pindah_tanam' && lahan) {
      await db.lahan.put({ ...lahan, status: 'aktif', updated_at: ts });
    }

    await enqueue('aktivitas', 'create', record.client_uuid, {
      client_uuid: record.client_uuid,
      lahan_uuid: record.lahan_uuid,
      tipe: record.tipe,
      tanggal: record.tanggal,
      jenis_pupuk: record.jenis_pupuk,
      jenis_pestisida: record.jenis_pestisida,
      catatan: record.catatan,
    });
    return record;
  },

  async remove(clientUuid: string): Promise<void> {
    const existing = await db.aktivitas.get(clientUuid);
    await db.aktivitas.delete(clientUuid);
    if (existing?.server_id) {
      await enqueue('aktivitas', 'delete', clientUuid, { server_id: existing.server_id });
    }
  },
};

/* --------------------------- TRANSAKSI --------------------------- */

export interface TransaksiInput {
  kategori: string;
  nominal: string;
  tanggal: string;
  lahan_uuid?: string | null;
  catatan?: string | null;
  tipe?: TransaksiTipe;
}

export const transaksiRepo = {
  async list(): Promise<TransaksiLocal[]> {
    const rows = await db.transaksi.toArray();
    return rows.sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.created_at.localeCompare(a.created_at));
  },

  // Saldo lokal = 0 - total kas keluar (cermin agregasi server).
  async saldo(): Promise<{ total_kas_keluar: number; saldo: number }> {
    const rows = await db.transaksi.toArray();
    const total = rows
      .filter((r) => r.tipe === 'kas_keluar')
      .reduce((sum, r) => sum + Number(r.nominal), 0);
    return { total_kas_keluar: total, saldo: 0 - total };
  },

  async create(input: TransaksiInput): Promise<TransaksiLocal> {
    const ts = nowIso();
    const lahan = input.lahan_uuid ? await db.lahan.get(input.lahan_uuid) : undefined;
    const record: TransaksiLocal = {
      client_uuid: newClientUuid(),
      server_id: null,
      tipe: input.tipe ?? 'kas_keluar',
      kategori: input.kategori,
      nominal: input.nominal,
      tanggal: input.tanggal,
      lahan_uuid: input.lahan_uuid ?? null,
      lahan_server_id: lahan?.server_id ?? null,
      catatan: input.catatan ?? null,
      created_at: ts,
      updated_at: ts,
      _dirty: 1,
    };
    await db.transaksi.put(record);
    await enqueue('transaksi', 'create', record.client_uuid, {
      client_uuid: record.client_uuid,
      tipe: record.tipe,
      kategori: record.kategori,
      nominal: record.nominal,
      tanggal: record.tanggal,
      lahan_uuid: record.lahan_uuid,
      catatan: record.catatan,
    });
    return record;
  },

  async remove(clientUuid: string): Promise<void> {
    const existing = await db.transaksi.get(clientUuid);
    await db.transaksi.delete(clientUuid);
    if (existing?.server_id) {
      await enqueue('transaksi', 'delete', clientUuid, { server_id: existing.server_id });
    }
  },
};
