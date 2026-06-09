import { useState, useCallback, useMemo } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonIcon,
  IonToast,
  IonAlert,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonModal,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  walletOutline,
  trendingDownOutline,
  trendingUpOutline,
  leafOutline,
  addCircle,
  removeCircle,
  statsChartOutline,
  downloadOutline,
} from 'ionicons/icons';
import type { TransaksiLocal, LahanLocal } from '../../db';
import { transaksiRepo, lahanRepo, type TransaksiInput } from '../../db/repository';
import { runSync } from '../../sync/SyncEngine';
import { api } from '../../api/client';
import { hydrateFromServer } from '../../sync/hydrate';
import { useSyncStore } from '../../store/syncStore';
import { SyncIndicator } from '../../components/SyncIndicator';
import { AccountButton } from '../../components/AccountButton';
import { EmptyState } from '../../components/EmptyState';
import { CardSkeleton } from '../../components/CardSkeleton';
import { TransaksiItem } from './TransaksiItem';
import { TransaksiFormModal } from './TransaksiFormModal';
import { CommodityAvatar } from '../../components/CommodityAvatar';
import { formatRupiah } from '../../utils/format';

type FilterTipe = 'semua' | 'kas_masuk' | 'kas_keluar';
const OFFLINE_MSG = 'Disimpan secara lokal (Mode Offline)';

export default function KeuanganPage(): React.JSX.Element {
  const [items, setItems] = useState<TransaksiLocal[]>([]);
  const [lahanOptions, setLahanOptions] = useState<LahanLocal[]>([]);
  const [komoditasList, setKomoditasList] = useState<string[]>([]);
  const [saldo, setSaldo] = useState({ total_kas_keluar: 0, total_kas_masuk: 0, saldo: 0 });
  const [ringkasanKomoditas, setRingkasanKomoditas] = useState<{ komoditas: string; total: number; jumlah: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaultTipe, setModalDefaultTipe] = useState<'kas_masuk' | 'kas_keluar'>('kas_masuk');
  const [editingTransaksi, setEditingTransaksi] = useState<TransaksiLocal | null>(null);
  const [filter, setFilter] = useState<FilterTipe>('semua');
  const [toast, setToast] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<TransaksiLocal | null>(null);
  const [detailModal, setDetailModal] = useState<{ title: string; items: TransaksiLocal[] } | null>(null);
  const refreshCounts = useSyncStore((s) => s.refreshCounts);

  const reload = useCallback(async (): Promise<void> => {
    const [transaksi, lahan, ringkasan, komoditas, rkKomoditas] = await Promise.all([
      transaksiRepo.list(),
      lahanRepo.list(),
      transaksiRepo.saldo(),
      lahanRepo.komoditasList(),
      transaksiRepo.ringkasanKomoditas(),
    ]);
    setItems(transaksi);
    setLahanOptions(lahan);
    setSaldo(ringkasan);
    setKomoditasList(komoditas);
    setRingkasanKomoditas(rkKomoditas);
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

  const filteredItems = useMemo(() => {
    if (filter === 'semua') return items;
    return items.filter((t) => t.tipe === filter);
  }, [items, filter]);

  // Ringkasan pengeluaran per kategori (top 3).
  const byKategori = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of items) {
      if (t.tipe === 'kas_keluar') map.set(t.kategori, (map.get(t.kategori) ?? 0) + Number(t.nominal));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [items]);

  const openModal = (tipe: 'kas_masuk' | 'kas_keluar'): void => {
    setEditingTransaksi(null);
    setModalDefaultTipe(tipe);
    setModalOpen(true);
  };

  const openEdit = (t: TransaksiLocal): void => {
    setEditingTransaksi(t);
    setModalDefaultTipe(t.tipe);
    setModalOpen(true);
  };

  const showKomoditasDetail = (komoditas: string): void => {
    const filtered = items.filter((t) => t.tipe === 'kas_masuk' && t.komoditas?.toLowerCase() === komoditas.toLowerCase());
    setDetailModal({ title: `Penjualan: ${komoditas}`, items: filtered });
  };

  const showKategoriDetail = (kategori: string): void => {
    const filtered = items.filter((t) => t.tipe === 'kas_keluar' && t.kategori.toLowerCase() === kategori.toLowerCase());
    setDetailModal({ title: `Pengeluaran: ${kategori}`, items: filtered });
  };

  const handleSubmit = async (input: TransaksiInput): Promise<void> => {
    if (editingTransaksi) {
      await transaksiRepo.update(editingTransaksi.client_uuid, input);
    } else {
      await transaksiRepo.create(input);
    }
    setEditingTransaksi(null);
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

  const handleExport = async (): Promise<void> => {
    try {
      const res = await api.get('/export/transaksi', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'export_transaksi_kebunku.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setToast('Gagal mengunduh export. Pastikan perangkat online.');
    }
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
            <button type="button" onClick={() => { void handleExport(); }} className="mr-3 text-slate-500 hover:text-slate-800">
              <IonIcon icon={downloadOutline} className="text-xl" />
            </button>
            <SyncIndicator />
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={(e) => void sync().then(() => e.detail.complete())}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="px-4 pb-24 pt-2">
          {loading ? (
            <CardSkeleton count={4} hero />
          ) : (
            <>
              {/* ═══ HERO SALDO ═══ */}
              <div className="kbn-hero kbn-fade-up p-5 mb-5">
                <div className="relative z-10">
                  <div className="flex items-center gap-1.5 text-white/70">
                    <IonIcon icon={walletOutline} className="text-base" />
                    <span className="text-[0.75rem] font-semibold tracking-wide uppercase">Saldo Bersih</span>
                  </div>
                  <p className="text-[2.1rem] font-extrabold mt-1.5 leading-none tracking-tight">
                    {formatRupiah(saldo.saldo)}
                  </p>

                  {/* Mini stats */}
                  <div className="grid grid-cols-2 gap-3 mt-4 pt-3.5 border-t border-white/15">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                        <IonIcon icon={trendingUpOutline} className="text-[#86efac] text-lg" />
                      </div>
                      <div>
                        <p className="text-[0.6rem] text-white/60 leading-none font-medium">Pemasukan</p>
                        <p className="text-[0.82rem] font-bold mt-0.5">{formatRupiah(saldo.total_kas_masuk)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                        <IonIcon icon={trendingDownOutline} className="text-[#fca5a5] text-lg" />
                      </div>
                      <div>
                        <p className="text-[0.6rem] text-white/60 leading-none font-medium">Pengeluaran</p>
                        <p className="text-[0.82rem] font-bold mt-0.5">{formatRupiah(saldo.total_kas_keluar)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══ QUICK ACTION BUTTONS ═══ */}
              <div className="grid grid-cols-2 gap-3 mb-5 kbn-fade-up" style={{ animationDelay: '0.06s' }}>
                <button
                  onClick={() => openModal('kas_masuk')}
                  className="kbn-card kbn-card-press flex items-center gap-2.5 p-3.5 active:scale-[0.97] transition-transform"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[#DCFCE7] flex items-center justify-center">
                    <IonIcon icon={addCircle} className="text-[#15803D] text-2xl" />
                  </div>
                  <div className="text-left">
                    <p className="text-[0.8rem] font-bold text-slate-dark">Pemasukan</p>
                    <p className="text-[0.65rem] text-slate-muted">Catat penjualan</p>
                  </div>
                </button>
                <button
                  onClick={() => openModal('kas_keluar')}
                  className="kbn-card kbn-card-press flex items-center gap-2.5 p-3.5 active:scale-[0.97] transition-transform"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[#FFE4E6] flex items-center justify-center">
                    <IonIcon icon={removeCircle} className="text-[#b91c1c] text-2xl" />
                  </div>
                  <div className="text-left">
                    <p className="text-[0.8rem] font-bold text-slate-dark">Pengeluaran</p>
                    <p className="text-[0.65rem] text-slate-muted">Catat belanja</p>
                  </div>
                </button>
              </div>

              {/* ═══ RINGKASAN KOMODITAS ═══ */}
              {ringkasanKomoditas.length > 0 && (
                <div className="kbn-card kbn-fade-up p-4 mb-5" style={{ animationDelay: '0.1s' }}>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#DCFCE7] flex items-center justify-center">
                        <IonIcon icon={leafOutline} className="text-[#15803D] text-sm" />
                      </div>
                      <p className="text-[0.82rem] font-bold text-slate-dark">Hasil Panen</p>
                    </div>
                    <span className="text-[0.7rem] text-[#15803D] font-semibold bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                      {ringkasanKomoditas.length} komoditas
                    </span>
                  </div>
                  <div className="space-y-3">
                    {ringkasanKomoditas.map(({ komoditas, total, jumlah }) => {
                      const maxTotal = ringkasanKomoditas[0]?.total ?? 1;
                      const pct = (total / maxTotal) * 100;
                      return (
                        <button
                          type="button"
                          key={komoditas}
                          className="group w-full text-left"
                          onClick={() => showKomoditasDetail(komoditas)}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <CommodityAvatar komoditas={komoditas} className="!w-7 !h-7 !text-base !rounded-lg" />
                              <span className="text-[0.82rem] capitalize text-slate-dark font-semibold">{komoditas}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[0.82rem] text-[#15803D] font-bold">{formatRupiah(total)}</span>
                              <span className="text-[0.6rem] text-slate-muted ml-1.5">{jumlah}x jual</span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-[#f1f5f9] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500 ease-out"
                              style={{
                                width: `${pct}%`,
                                background: `linear-gradient(90deg, #198754, #21a366)`,
                              }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ═══ RINGKASAN PENGELUARAN ═══ */}
              {byKategori.length > 0 && (
                <div className="kbn-card kbn-fade-up p-4 mb-5" style={{ animationDelay: '0.14s' }}>
                  <div className="flex items-center gap-2 mb-3.5">
                    <div className="w-7 h-7 rounded-lg bg-[#FFE4E6] flex items-center justify-center">
                      <IonIcon icon={statsChartOutline} className="text-[#b91c1c] text-sm" />
                    </div>
                    <p className="text-[0.82rem] font-bold text-slate-dark">Pengeluaran Teratas</p>
                  </div>
                  <div className="space-y-3">
                    {byKategori.map(([kat, total]) => {
                      const pct = saldo.total_kas_keluar > 0 ? (total / saldo.total_kas_keluar) * 100 : 0;
                      return (
                        <button
                          type="button"
                          key={kat}
                          className="w-full text-left"
                          onClick={() => showKategoriDetail(kat)}
                        >
                          <div className="flex justify-between text-[0.78rem] mb-1.5">
                            <span className="capitalize text-slate-dark font-medium">{kat}</span>
                            <span className="text-[#b91c1c] font-semibold">{formatRupiah(total)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-[#f1f5f9] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500 ease-out"
                              style={{
                                width: `${pct}%`,
                                background: `linear-gradient(90deg, #f87171, #ef4444)`,
                              }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ═══ RIWAYAT TRANSAKSI ═══ */}
              <div className="kbn-fade-up" style={{ animationDelay: '0.18s' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[0.9rem] font-bold text-slate-dark">Riwayat</p>
                  <span className="text-[0.7rem] text-slate-muted font-medium">{filteredItems.length} transaksi</span>
                </div>

                {/* Filter tabs */}
                <IonSegment
                  className="kbn-segment mb-4"
                  value={filter}
                  onIonChange={(e) => setFilter(e.detail.value as FilterTipe)}
                >
                  <IonSegmentButton value="semua">
                    <IonLabel>Semua</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="kas_masuk">
                    <IonLabel>Masuk</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="kas_keluar">
                    <IonLabel>Keluar</IonLabel>
                  </IonSegmentButton>
                </IonSegment>

                {filteredItems.length === 0 ? (
                  items.length === 0 ? (
                    <EmptyState
                      icon={walletOutline}
                      title="Belum ada transaksi"
                      subtitle="Catat pemasukan atau pengeluaran untuk melacak arus kas kebun."
                      actionLabel="Catat Transaksi"
                      onAction={() => openModal('kas_masuk')}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-caption text-slate-muted">Tidak ada transaksi untuk filter ini.</p>
                    </div>
                  )
                ) : (
                  <div className="kbn-stagger">
                    {filteredItems.map((t) => (
                      <TransaksiItem key={t.client_uuid} transaksi={t} onDelete={setToDelete} onEdit={openEdit} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <TransaksiFormModal
          isOpen={modalOpen}
          defaultTipe={modalDefaultTipe}
          lahanOptions={lahanOptions}
          komoditasList={komoditasList}
          editing={editingTransaksi}
          onClose={() => { setModalOpen(false); setEditingTransaksi(null); }}
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

        {/* Detail breakdown modal */}
        <IonModal
          isOpen={detailModal !== null}
          onDidDismiss={() => setDetailModal(null)}
          initialBreakpoint={0.65}
          breakpoints={[0, 0.65, 0.9]}
        >
          <IonContent className="ion-padding">
            <p className="text-sm font-bold text-slate-800 mb-1">{detailModal?.title}</p>
            <p className="text-[11px] text-slate-500 mb-3">{detailModal?.items.length} transaksi</p>
            {detailModal?.items.length === 0 ? (
              <p className="text-center text-slate-400 text-[11px] py-6">Tidak ada data.</p>
            ) : (
              <div className="space-y-2">
                {detailModal?.items.map((t) => (
                  <TransaksiItem key={t.client_uuid} transaksi={t} onDelete={setToDelete} onEdit={openEdit} />
                ))}
              </div>
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
}
