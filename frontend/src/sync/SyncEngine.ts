import { api, isNetworkError } from '../api/client';
import { db, type SyncItem } from '../db';
import { useSyncStore } from '../store/syncStore';
import type { ApiResource, Lahan, Aktivitas, Transaksi } from '../types';

// Batas percobaan ulang sebelum item ditandai gagal (mencegah retry tak terbatas).
const MAX_ATTEMPTS = 8;

let running = false;

// Resolusi server_id lahan dari lahan_uuid lokal (lahan mungkin baru tersinkron).
async function resolveLahanServerId(lahanUuid: string | null | undefined): Promise<number | null> {
  if (!lahanUuid) return null;
  const lahan = await db.lahan.get(lahanUuid);
  return lahan?.server_id ?? null;
}

async function processItem(item: SyncItem): Promise<void> {
  const { entity, op, client_uuid, payload } = item;

  if (op === 'delete') {
    const serverId = payload.server_id as number | undefined;
    if (serverId) {
      await api.delete(`/${entity}/${serverId}`);
    }
    return;
  }

  if (op === 'update') {
    const serverId = payload.server_id as number | undefined;
    if (!serverId) return; // belum punya server_id; create akan menanganinya
    await api.put(`/${entity}/${serverId}`, payload);
    return;
  }

  // op === 'create'
  if (entity === 'lahan') {
    const res = await api.post<ApiResource<Lahan>>('/lahan', payload);
    const server = res.data.data;
    const local = await db.lahan.get(client_uuid);
    if (local) {
      await db.lahan.put({ ...local, server_id: server.id, _dirty: 0 });
    }
    return;
  }

  if (entity === 'aktivitas') {
    const lahanServerId = await resolveLahanServerId(payload.lahan_uuid as string);
    if (!lahanServerId) {
      // Lahan terkait belum tersinkron; lempar agar item tetap pending dan dicoba lagi.
      throw new Error('PENDING_DEPENDENCY: lahan belum tersinkron');
    }
    const body = {
      client_uuid: payload.client_uuid,
      lahan_id: lahanServerId,
      tipe: payload.tipe,
      tanggal: payload.tanggal,
      jenis_pupuk: payload.jenis_pupuk,
      jenis_pestisida: payload.jenis_pestisida,
      catatan: payload.catatan,
    };
    const res = await api.post<ApiResource<Aktivitas>>('/aktivitas', body);
    const server = res.data.data;
    const local = await db.aktivitas.get(client_uuid);
    if (local) {
      await db.aktivitas.put({ ...local, server_id: server.id, lahan_server_id: lahanServerId, _dirty: 0 });
    }
    return;
  }

  if (entity === 'transaksi') {
    const lahanServerId = payload.lahan_uuid
      ? await resolveLahanServerId(payload.lahan_uuid as string)
      : null;
    // Jika transaksi terkait lahan yang belum tersinkron, tunggu.
    if (payload.lahan_uuid && !lahanServerId) {
      throw new Error('PENDING_DEPENDENCY: lahan belum tersinkron');
    }
    const body = {
      client_uuid: payload.client_uuid,
      tipe: payload.tipe,
      kategori: payload.kategori,
      nominal: payload.nominal,
      tanggal: payload.tanggal,
      lahan_id: lahanServerId,
      catatan: payload.catatan,
    };
    const res = await api.post<ApiResource<Transaksi>>('/transaksi', body);
    const server = res.data.data;
    const local = await db.transaksi.get(client_uuid);
    if (local) {
      await db.transaksi.put({ ...local, server_id: server.id, _dirty: 0 });
    }
    return;
  }
}

// Proses antrean sync secara FIFO.
export async function runSync(): Promise<void> {
  if (running || !navigator.onLine) return;
  running = true;
  const store = useSyncStore.getState();
  store.setSyncing(true);

  try {
    const items = await db.sync_queue
      .where('status')
      .equals('pending')
      .sortBy('id');

    for (const item of items) {
      try {
        await processItem(item);
        // Sukses → hapus item dari queue (Req 5.7).
        if (item.id !== undefined) await db.sync_queue.delete(item.id);
      } catch (error) {
        const attempts = item.attempts + 1;
        const isDependency =
          error instanceof Error && error.message.startsWith('PENDING_DEPENDENCY');

        if (isNetworkError(error) || isDependency) {
          // Gagal jaringan / dependensi belum siap → pertahankan, coba lagi (Req 5.5).
          // Setelah MAX_ATTEMPTS, tandai gagal agar tidak mencoba selamanya.
          const status: SyncItem['status'] = attempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
          if (item.id !== undefined) {
            await db.sync_queue.update(item.id, {
              attempts,
              status,
              last_error: error instanceof Error ? error.message : 'network',
            });
          }
          // Hentikan siklus saat jaringan putus agar tidak membuang percobaan.
          if (isNetworkError(error)) break;
        } else {
          // Error validasi/4xx (bukan jaringan) → tandai gagal, jangan retry selamanya (Req 5.6).
          if (item.id !== undefined) {
            await db.sync_queue.update(item.id, {
              attempts,
              status: 'failed',
              last_error: error instanceof Error ? error.message : 'error',
            });
          }
        }
      }
    }

    store.markSynced();
  } finally {
    running = false;
    store.setSyncing(false);
    await store.refreshCounts();
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

// Pasang pemicu sync: event online, app start, interval ringan.
export function startSyncEngine(): void {
  const trigger = (): void => {
    void runSync();
  };

  window.addEventListener('online', trigger);

  // App start.
  if (navigator.onLine) trigger();

  // Interval ringan (30 detik).
  if (intervalId === null) {
    intervalId = setInterval(trigger, 30_000);
  }

  void useSyncStore.getState().refreshCounts();
}

export function stopSyncEngine(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
