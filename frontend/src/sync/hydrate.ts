import { api } from '../api/client';
import {
  db,
  type LahanLocal,
  type AktivitasLocal,
  type TransaksiLocal,
  type PanenLocal,
  type MusimTanamLocal,
} from '../db';
import type { ApiCollection, Lahan, Aktivitas, Transaksi, TransaksiMeta, Panen, MusimTanam } from '../types';

// Tarik data dari server ke cache Dexie agar UI dapat membaca (online maupun nanti offline).
// Tidak menimpa record yang masih kotor (_dirty=1) atau yang masih punya antrean pending.
export async function hydrateFromServer(): Promise<void> {
  if (!navigator.onLine) return;

  // client_uuid yang masih menunggu sync — jangan ditimpa oleh data server.
  const pending = await db.sync_queue.where('status').equals('pending').toArray();
  const pendingUuids = new Set(pending.map((p) => p.client_uuid));

  const [lahanRes, aktivitasRes, transaksiRes, panenRes, musimRes] = await Promise.all([
    api.get<ApiCollection<Lahan>>('/lahan'),
    api.get<ApiCollection<Aktivitas>>('/aktivitas'),
    api.get<ApiCollection<Transaksi, TransaksiMeta>>('/transaksi'),
    api.get<ApiCollection<Panen>>('/panen'),
    api.get<ApiCollection<MusimTanam>>('/musim-tanam'),
  ]);

  // Peta server lahan_id -> client_uuid (untuk relasi transaksi).
  const lahanIdToUuid = new Map<number, string>();

  await db.transaction('rw', [db.lahan, db.aktivitas, db.transaksi, db.panen, db.musim_tanam], async () => {
    for (const l of lahanRes.data.data) {
      if (l.id !== null) lahanIdToUuid.set(l.id, l.client_uuid);
      if (pendingUuids.has(l.client_uuid)) continue;
      const local: LahanLocal = {
        client_uuid: l.client_uuid,
        server_id: l.id,
        nomor_bed: l.nomor_bed,
        komoditas: l.komoditas,
        icon: l.icon ?? null,
        status: l.status,
        tanggal_tanam: l.tanggal_tanam ?? null,
        catatan: l.catatan,
        created_at: l.created_at ?? new Date().toISOString(),
        updated_at: l.updated_at ?? new Date().toISOString(),
        _dirty: 0,
      };
      await db.lahan.put(local);
    }

    for (const a of aktivitasRes.data.data) {
      if (pendingUuids.has(a.client_uuid)) continue;
      const lahanUuid = a.lahan?.client_uuid ?? lahanIdToUuid.get(Number(a.lahan_id)) ?? '';
      const local: AktivitasLocal = {
        client_uuid: a.client_uuid,
        server_id: a.id,
        lahan_uuid: lahanUuid,
        lahan_server_id: Number(a.lahan_id),
        tipe: a.tipe,
        tanggal: a.tanggal,
        jenis_pupuk: a.jenis_pupuk,
        jenis_pestisida: a.jenis_pestisida,
        catatan: a.catatan,
        created_at: a.created_at ?? new Date().toISOString(),
        updated_at: a.updated_at ?? new Date().toISOString(),
        _dirty: 0,
      };
      await db.aktivitas.put(local);
    }

    for (const t of transaksiRes.data.data) {
      if (pendingUuids.has(t.client_uuid)) continue;
      const lahanUuid =
        t.lahan_id != null ? (lahanIdToUuid.get(Number(t.lahan_id)) ?? null) : null;
      const local: TransaksiLocal = {
        client_uuid: t.client_uuid,
        server_id: t.id,
        tipe: t.tipe,
        kategori: t.kategori,
        komoditas: t.komoditas ?? null,
        nominal: t.nominal,
        tanggal: t.tanggal,
        lahan_uuid: lahanUuid,
        lahan_server_id: t.lahan_id != null ? Number(t.lahan_id) : null,
        catatan: t.catatan,
        created_at: t.created_at ?? new Date().toISOString(),
        updated_at: t.updated_at ?? new Date().toISOString(),
        _dirty: 0,
      };
      await db.transaksi.put(local);
    }

    for (const p of panenRes.data.data) {
      if (pendingUuids.has(p.client_uuid)) continue;
      const lahanUuid = lahanIdToUuid.get(p.lahan_id) ?? '';
      const local: PanenLocal = {
        client_uuid: p.client_uuid,
        server_id: p.id,
        lahan_uuid: lahanUuid,
        lahan_server_id: p.lahan_id,
        tanggal: p.tanggal,
        berat: p.berat,
        grade: p.grade ?? null,
        harga_jual: p.harga_jual ?? null,
        pembeli: p.pembeli ?? null,
        catatan: p.catatan,
        created_at: p.created_at ?? new Date().toISOString(),
        updated_at: p.updated_at ?? new Date().toISOString(),
        _dirty: 0,
      };
      await db.panen.put(local);
    }

    for (const m of musimRes.data.data) {
      if (pendingUuids.has(m.client_uuid)) continue;
      const lahanUuid = lahanIdToUuid.get(m.lahan_id) ?? '';
      const local: MusimTanamLocal = {
        client_uuid: m.client_uuid,
        server_id: m.id,
        lahan_uuid: lahanUuid,
        lahan_server_id: m.lahan_id,
        komoditas: m.komoditas,
        tanggal_mulai: m.tanggal_mulai,
        tanggal_selesai: m.tanggal_selesai ?? null,
        status: m.status,
        catatan: m.catatan,
        created_at: m.created_at ?? new Date().toISOString(),
        updated_at: m.updated_at ?? new Date().toISOString(),
        _dirty: 0,
      };
      await db.musim_tanam.put(local);
    }
  });
}
