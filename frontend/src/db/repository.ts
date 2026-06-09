import {
  db,
  type LahanLocal,
  type AktivitasLocal,
  type TransaksiLocal,
  type PanenLocal,
  type MusimTanamLocal,
  type SyncEntity,
  type SyncOp,
} from './index';
import { newClientUuid, nowIso } from './uuid';
import type { LahanStatus, AktivitasTipe, TransaksiTipe } from '../types';

// Repository = satu titik mutasi per domain.
// Pola: tulis salinan lokal (_dirty=1) + antrekan ke sync_queue. UI selalu baca dari Dexie.
// SyncEngine yang mengirim antrean ke server (idempoten via client_uuid).

async function enqueue(
  entity: SyncEntity,
  op: SyncOp,
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
  icon?: string | null;
  status?: LahanStatus;
  tanggal_tanam?: string | null;
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
      icon: input.icon ?? null,
      status: input.status ?? 'semai',
      tanggal_tanam: input.tanggal_tanam ?? null,
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
      icon: record.icon,
      status: record.status,
      tanggal_tanam: record.tanggal_tanam,
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
      icon: input.icon ?? existing.icon,
      status: input.status ?? existing.status,
      tanggal_tanam: input.tanggal_tanam ?? existing.tanggal_tanam,
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
        icon: updated.icon,
        status: updated.status,
        tanggal_tanam: updated.tanggal_tanam,
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
  tipe?: TransaksiTipe;
  kategori: string;
  komoditas?: string | null;
  nominal: string;
  tanggal: string;
  lahan_uuid?: string | null;
  catatan?: string | null;
}

export const transaksiRepo = {
  async list(): Promise<TransaksiLocal[]> {
    const rows = await db.transaksi.toArray();
    return rows.sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.created_at.localeCompare(a.created_at));
  },

  async saldo(): Promise<{ total_kas_keluar: number; total_kas_masuk: number; saldo: number }> {
    const rows = await db.transaksi.toArray();
    const totalKeluar = rows
      .filter((r) => r.tipe === 'kas_keluar')
      .reduce((sum, r) => sum + Number(r.nominal), 0);
    const totalMasuk = rows
      .filter((r) => r.tipe === 'kas_masuk')
      .reduce((sum, r) => sum + Number(r.nominal), 0);
    return { total_kas_keluar: totalKeluar, total_kas_masuk: totalMasuk, saldo: totalMasuk - totalKeluar };
  },

  async ringkasanKomoditas(): Promise<{ komoditas: string; total: number; jumlah: number }[]> {
    const rows = await db.transaksi.where('tipe').equals('kas_masuk').toArray();
    const map = new Map<string, { total: number; jumlah: number }>();
    for (const r of rows) {
      if (!r.komoditas) continue;
      const existing = map.get(r.komoditas) ?? { total: 0, jumlah: 0 };
      existing.total += Number(r.nominal);
      existing.jumlah += 1;
      map.set(r.komoditas, existing);
    }
    return [...map.entries()]
      .map(([komoditas, v]) => ({ komoditas, total: v.total, jumlah: v.jumlah }))
      .sort((a, b) => b.total - a.total);
  },

  async create(input: TransaksiInput): Promise<TransaksiLocal> {
    const ts = nowIso();
    const lahan = input.lahan_uuid ? await db.lahan.get(input.lahan_uuid) : undefined;
    const record: TransaksiLocal = {
      client_uuid: newClientUuid(),
      server_id: null,
      tipe: input.tipe ?? 'kas_keluar',
      kategori: input.kategori,
      komoditas: input.komoditas ?? null,
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
      komoditas: record.komoditas,
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

  async update(clientUuid: string, input: TransaksiInput): Promise<TransaksiLocal> {
    const existing = await db.transaksi.get(clientUuid);
    if (!existing) throw new Error('Transaksi tidak ditemukan');
    const updated: TransaksiLocal = {
      ...existing,
      tipe: input.tipe ?? existing.tipe,
      kategori: input.kategori,
      komoditas: input.komoditas ?? null,
      nominal: input.nominal,
      tanggal: input.tanggal,
      catatan: input.catatan ?? null,
      updated_at: nowIso(),
      _dirty: 1,
    };
    await db.transaksi.put(updated);
    if (updated.server_id) {
      await enqueue('transaksi', 'update', clientUuid, {
        server_id: updated.server_id,
        tipe: updated.tipe,
        kategori: updated.kategori,
        komoditas: updated.komoditas,
        nominal: updated.nominal,
        tanggal: updated.tanggal,
        catatan: updated.catatan,
      });
    }
    return updated;
  },
};

/* ----------------------------- PANEN ----------------------------- */

export interface PanenInput {
  lahan_uuid: string;
  tanggal: string;
  berat: string;
  grade?: string | null;
  harga_jual?: string | null;
  pembeli?: string | null;
  catatan?: string | null;
}

export const panenRepo = {
  async list(): Promise<PanenLocal[]> {
    const rows = await db.panen.toArray();
    return rows.sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.created_at.localeCompare(a.created_at));
  },

  async listByLahan(lahanUuid: string): Promise<PanenLocal[]> {
    const rows = await db.panen.where('lahan_uuid').equals(lahanUuid).toArray();
    return rows.sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.created_at.localeCompare(a.created_at));
  },

  async create(input: PanenInput): Promise<PanenLocal> {
    const ts = nowIso();
    const lahan = await db.lahan.get(input.lahan_uuid);
    const record: PanenLocal = {
      client_uuid: newClientUuid(),
      server_id: null,
      lahan_uuid: input.lahan_uuid,
      lahan_server_id: lahan?.server_id ?? null,
      tanggal: input.tanggal,
      berat: input.berat,
      grade: input.grade ?? null,
      harga_jual: input.harga_jual ?? null,
      pembeli: input.pembeli ?? null,
      catatan: input.catatan ?? null,
      created_at: ts,
      updated_at: ts,
      _dirty: 1,
    };
    await db.panen.put(record);
    await enqueue('panen', 'create', record.client_uuid, {
      client_uuid: record.client_uuid,
      lahan_uuid: record.lahan_uuid,
      tanggal: record.tanggal,
      berat: record.berat,
      grade: record.grade,
      harga_jual: record.harga_jual,
      pembeli: record.pembeli,
      catatan: record.catatan,
    });
    return record;
  },

  async remove(clientUuid: string): Promise<void> {
    const existing = await db.panen.get(clientUuid);
    await db.panen.delete(clientUuid);
    if (existing?.server_id) {
      await enqueue('panen', 'delete', clientUuid, { server_id: existing.server_id });
    }
  },
};

/* --------------------------- MUSIM TANAM --------------------------- */

import type { MusimStatus } from '../types';

export interface MusimTanamInput {
  lahan_uuid: string;
  komoditas: string;
  tanggal_mulai: string;
  tanggal_selesai?: string | null;
  status?: MusimStatus;
  catatan?: string | null;
}

export const musimTanamRepo = {
  async list(): Promise<MusimTanamLocal[]> {
    const rows = await db.musim_tanam.toArray();
    return rows.sort((a, b) => b.tanggal_mulai.localeCompare(a.tanggal_mulai) || b.created_at.localeCompare(a.created_at));
  },

  async getActiveByLahan(lahanUuid: string): Promise<MusimTanamLocal | undefined> {
    return (await db.musim_tanam.where('lahan_uuid').equals(lahanUuid).toArray())
      .filter(m => m.status === 'aktif')
      .sort((a, b) => b.tanggal_mulai.localeCompare(a.tanggal_mulai))[0];
  },

  async create(input: MusimTanamInput): Promise<MusimTanamLocal> {
    const ts = nowIso();
    const lahan = await db.lahan.get(input.lahan_uuid);
    const record: MusimTanamLocal = {
      client_uuid: newClientUuid(),
      server_id: null,
      lahan_uuid: input.lahan_uuid,
      lahan_server_id: lahan?.server_id ?? null,
      komoditas: input.komoditas,
      tanggal_mulai: input.tanggal_mulai,
      tanggal_selesai: input.tanggal_selesai ?? null,
      status: input.status ?? 'aktif',
      catatan: input.catatan ?? null,
      created_at: ts,
      updated_at: ts,
      _dirty: 1,
    };
    await db.musim_tanam.put(record);
    await enqueue('musim_tanam', 'create', record.client_uuid, {
      client_uuid: record.client_uuid,
      lahan_uuid: record.lahan_uuid,
      komoditas: record.komoditas,
      tanggal_mulai: record.tanggal_mulai,
      tanggal_selesai: record.tanggal_selesai,
      status: record.status,
      catatan: record.catatan,
    });
    return record;
  },

  async update(clientUuid: string, input: Partial<MusimTanamInput>): Promise<MusimTanamLocal> {
    const existing = await db.musim_tanam.get(clientUuid);
    if (!existing) throw new Error('Musim tanam tidak ditemukan');
    const updated: MusimTanamLocal = {
      ...existing,
      ...input,
      updated_at: nowIso(),
      _dirty: 1,
    };
    await db.musim_tanam.put(updated);
    if (updated.server_id) {
      await enqueue('musim_tanam', 'update', clientUuid, {
        server_id: updated.server_id,
        komoditas: updated.komoditas,
        tanggal_mulai: updated.tanggal_mulai,
        tanggal_selesai: updated.tanggal_selesai,
        status: updated.status,
        catatan: updated.catatan,
      });
    }
    return updated;
  },

  async remove(clientUuid: string): Promise<void> {
    const existing = await db.musim_tanam.get(clientUuid);
    await db.musim_tanam.delete(clientUuid);
    if (existing?.server_id) {
      await enqueue('musim_tanam', 'delete', clientUuid, { server_id: existing.server_id });
    }
  },
};
