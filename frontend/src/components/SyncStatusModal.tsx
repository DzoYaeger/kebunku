import { useState, useEffect, useCallback } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
} from '@ionic/react';
import {
  cloudOfflineOutline,
  checkmarkCircleOutline,
  warningOutline,
  syncOutline,
  refreshOutline,
} from 'ionicons/icons';
import { db, type SyncItem } from '../db';
import { retryFailed } from '../sync/SyncEngine';
import { useSyncStore } from '../store/syncStore';

const ENTITY_LABEL: Record<string, string> = {
  lahan: 'Tanaman',
  aktivitas: 'Aktivitas',
  transaksi: 'Transaksi',
};
const OP_LABEL: Record<string, string> = {
  create: 'Tambah',
  update: 'Ubah',
  delete: 'Hapus',
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SyncStatusModal({ isOpen, onClose }: Props): React.JSX.Element {
  const { isOnline, pendingCount, failedCount, lastSyncedAt } = useSyncStore();
  const [items, setItems] = useState<SyncItem[]>([]);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const all = await db.sync_queue.orderBy('id').toArray();
    setItems(all);
  }, []);

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen, load]);

  const handleRetry = async (): Promise<void> => {
    setRetrying(true);
    try {
      await retryFailed();
      await load();
    } finally {
      setRetrying(false);
    }
  };

  const failed = items.filter((i) => i.status === 'failed');
  const pending = items.filter((i) => i.status === 'pending');

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} initialBreakpoint={0.7} breakpoints={[0, 0.7, 1]}>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>Status Sinkronisasi</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Tutup</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* Ringkasan koneksi */}
        <div className="kbn-card p-4 mb-4 flex items-center gap-3">
          <IonIcon
            icon={isOnline ? (failedCount > 0 ? warningOutline : checkmarkCircleOutline) : cloudOfflineOutline}
            className={`text-2xl ${
              !isOnline ? 'text-slate-muted' : failedCount > 0 ? 'text-badge-keluar-text' : 'text-emerald'
            }`}
          />
          <div className="flex-1">
            <p className="text-heading-md text-slate-dark">
              {isOnline ? (failedCount > 0 ? 'Ada yang gagal tersinkron' : 'Terhubung') : 'Mode Offline'}
            </p>
            <p className="text-caption text-slate-muted">
              {pendingCount} menunggu · {failedCount} gagal
              {lastSyncedAt ? ` · sync terakhir ${new Date(lastSyncedAt).toLocaleTimeString('id-ID')}` : ''}
            </p>
          </div>
        </div>

        {/* Daftar gagal */}
        {failed.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-heading-md text-slate-dark">Gagal ({failed.length})</h2>
              <IonButton size="small" onClick={() => void handleRetry()} disabled={retrying}>
                <IonIcon slot="start" icon={refreshOutline} />
                {retrying ? 'Mencoba…' : 'Coba lagi'}
              </IonButton>
            </div>
            {failed.map((it) => (
              <div key={it.id} className="kbn-card p-3 mb-2 border-l-4 border-l-[#b91c1c]">
                <p className="text-body font-semibold text-slate-dark">
                  {OP_LABEL[it.op] ?? it.op} {ENTITY_LABEL[it.entity] ?? it.entity}
                </p>
                <p className="text-caption text-badge-keluar-text mt-0.5">{it.last_error ?? 'Error'}</p>
                <p className="text-[0.7rem] text-slate-400 mt-0.5">{it.attempts}× percobaan</p>
              </div>
            ))}
          </div>
        )}

        {/* Daftar menunggu */}
        {pending.length > 0 && (
          <div className="mb-4">
            <h2 className="text-heading-md text-slate-dark mb-2 px-1">Menunggu ({pending.length})</h2>
            {pending.map((it) => (
              <div key={it.id} className="kbn-card p-3 mb-2 flex items-center gap-2">
                <IonIcon icon={syncOutline} className="text-slate-muted" />
                <p className="text-body text-slate-dark">
                  {OP_LABEL[it.op] ?? it.op} {ENTITY_LABEL[it.entity] ?? it.entity}
                </p>
              </div>
            ))}
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center text-slate-muted mt-10">
            <IonIcon icon={checkmarkCircleOutline} className="text-4xl mb-2 text-emerald" />
            <p className="text-body">Semua data sudah tersinkron.</p>
          </div>
        )}

        {failed.length > 0 && (
          <p className="text-caption text-slate-muted px-1 mt-2">
            Item gagal biasanya karena server sempat tidak aktif atau data tidak valid. Pastikan server berjalan
            (jalankan <span className="font-semibold">php artisan serve</span>) lalu tekan “Coba lagi”.
          </p>
        )}
      </IonContent>
    </IonModal>
  );
}
