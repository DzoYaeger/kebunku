import { useState, useCallback, useMemo } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonToast,
  IonAlert,
  IonRefresher,
  IonRefresherContent,
  useIonViewWillEnter,
} from '@ionic/react';
import { add, walletOutline, trendingDownOutline, receiptOutline } from 'ionicons/icons';
import type { TransaksiLocal, LahanLocal } from '../../db';
import { transaksiRepo, lahanRepo, type TransaksiInput } from '../../db/repository';
import { runSync } from '../../sync/SyncEngine';
import { hydrateFromServer } from '../../sync/hydrate';
import { useSyncStore } from '../../store/syncStore';
import { SyncIndicator } from '../../components/SyncIndicator';
import { AccountButton } from '../../components/AccountButton';
import { EmptyState } from '../../components/EmptyState';
import { CardSkeleton } from '../../components/CardSkeleton';
import { TransaksiItem } from './TransaksiItem';
import { TransaksiFormModal } from './TransaksiFormModal';
import { formatRupiah } from '../../utils/format';

const OFFLINE_MSG = 'Disimpan secara lokal (Mode Offline)';

export default function KeuanganPage(): React.JSX.Element {
  const [items, setItems] = useState<TransaksiLocal[]>([]);
  const [lahanOptions, setLahanOptions] = useState<LahanLocal[]>([]);
  const [saldo, setSaldo] = useState({ total_kas_keluar: 0, saldo: 0 });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<TransaksiLocal | null>(null);
  const refreshCounts = useSyncStore((s) => s.refreshCounts);

  const reload = useCallback(async (): Promise<void> => {
    const [transaksi, lahan, ringkasan] = await Promise.all([
      transaksiRepo.list(),
      lahanRepo.list(),
      transaksiRepo.saldo(),
    ]);
    setItems(transaksi);
    setLahanOptions(lahan);
    setSaldo(ringkasan);
  }, []);

  const sync = useCallback(async (): Promise<void> => {
    if (!navigator.onLine) return;
    try {
      await hydrateFromServer();
      await reload();
    } catch {
      /* pakai data lokal */
    }
  }, [reload]);

  useIonViewWillEnter(() => {
    void (async (): Promise<void> => {
      await reload();
      setLoading(false);
      await sync();
    })();
  });

  // Ringkasan per kategori (top 3).
  const byKategori = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of items) map.set(t.kategori, (map.get(t.kategori) ?? 0) + Number(t.nominal));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [items]);

  const handleSubmit = async (input: TransaksiInput): Promise<void> => {
    await transaksiRepo.create(input);
    await reload();
    await refreshCounts();
    if (navigator.onLine) void runSync().then(reload);
    else setToast(OFFLINE_MSG);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!toDelete) return;
    await transaksiRepo.remove(toDelete.client_uuid);
    setToDelete(null);
    await reload();
    await refreshCounts();
    if (navigator.onLine) void runSync().then(reload);
    else setToast(OFFLINE_MSG);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <AccountButton />
          </IonButtons>
          <IonTitle>Keuangan</IonTitle>
          <IonButtons slot="end">
            <SyncIndicator />
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={(e) => void sync().then(() => e.detail.complete())}>
          <IonRefresherContent />
        </IonRefresher>

        <IonHeader collapse="condense" className="ion-no-border">
          <IonToolbar>
            <IonTitle size="large" className="title-large">
              Keuangan
            </IonTitle>
          </IonToolbar>
        </IonHeader>

        <div className="px-4 pb-24">
          {loading ? (
            <CardSkeleton count={4} hero />
          ) : (
            <>
              {/* Hero saldo */}
              <div className="kbn-hero kbn-fade-up p-5 mb-4">
                <div className="relative z-10">
                  <div className="flex items-center gap-1.5 text-white/80">
                    <IonIcon icon={walletOutline} className="text-sm" />
                    <span className="text-caption font-medium">Saldo</span>
                  </div>
                  <p className="text-[1.9rem] font-extrabold mt-1 leading-tight">
                    {formatRupiah(saldo.saldo)}
                  </p>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/15">
                    <div className="flex items-center gap-1.5">
                      <IonIcon icon={trendingDownOutline} className="text-white/80" />
                      <div>
                        <p className="text-[0.65rem] text-white/70 leading-none">Total Kas Keluar</p>
                        <p className="text-caption font-bold">{formatRupiah(saldo.total_kas_keluar)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <IonIcon icon={receiptOutline} className="text-white/80" />
                      <div>
                        <p className="text-[0.65rem] text-white/70 leading-none">Transaksi</p>
                        <p className="text-caption font-bold">{items.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ringkasan per kategori */}
              {byKategori.length > 0 && (
                <div className="kbn-card kbn-fade-up p-4 mb-4">
                  <p className="text-caption font-semibold text-slate-muted mb-3">Pengeluaran Teratas</p>
                  <div className="space-y-2.5">
                    {byKategori.map(([kat, total]) => {
                      const pct = saldo.total_kas_keluar > 0 ? (total / saldo.total_kas_keluar) * 100 : 0;
                      return (
                        <div key={kat}>
                          <div className="flex justify-between text-caption mb-1">
                            <span className="capitalize text-slate-dark font-medium">{kat}</span>
                            <span className="text-slate-muted">{formatRupiah(total)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {items.length === 0 ? (
                <EmptyState
                  icon={walletOutline}
                  title="Belum ada transaksi"
                  subtitle="Catat pengeluaran pertama untuk melacak arus kas kebun."
                  actionLabel="Catat Kas Keluar"
                  onAction={() => setModalOpen(true)}
                />
              ) : (
                <div className="kbn-stagger">
                  {items.map((t) => (
                    <TransaksiItem key={t.client_uuid} transaksi={t} onDelete={setToDelete} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton onClick={() => setModalOpen(true)}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <TransaksiFormModal
          isOpen={modalOpen}
          lahanOptions={lahanOptions}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />

        <IonAlert
          isOpen={toDelete !== null}
          header="Hapus transaksi?"
          message={toDelete ? `${toDelete.kategori} ${formatRupiah(toDelete.nominal)} akan dihapus.` : ''}
          buttons={[
            { text: 'Batal', role: 'cancel', handler: () => setToDelete(null) },
            { text: 'Hapus', role: 'destructive', handler: () => void confirmDelete() },
          ]}
          onDidDismiss={() => setToDelete(null)}
        />

        <IonToast
          isOpen={toast !== null}
          message={toast ?? ''}
          duration={2000}
          onDidDismiss={() => setToast(null)}
          color="medium"
        />
      </IonContent>
    </IonPage>
  );
}
