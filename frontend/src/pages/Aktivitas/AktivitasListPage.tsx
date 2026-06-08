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
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  add,
  documentTextOutline,
  calendarOutline,
  leafOutline,
  swapHorizontalOutline,
  flaskOutline,
  bugOutline,
} from 'ionicons/icons';
import type { AktivitasLocal, LahanLocal } from '../../db';
import type { AktivitasTipe } from '../../types';
import { aktivitasRepo, lahanRepo, type AktivitasInput } from '../../db/repository';
import { runSync } from '../../sync/SyncEngine';
import { hydrateFromServer } from '../../sync/hydrate';
import { useSyncStore } from '../../store/syncStore';
import { SyncIndicator } from '../../components/SyncIndicator';
import { AccountButton } from '../../components/AccountButton';
import { EmptyState } from '../../components/EmptyState';
import { CardSkeleton } from '../../components/CardSkeleton';
import { AktivitasItem } from './AktivitasItem';
import { AktivitasFormModal } from './AktivitasFormModal';

const OFFLINE_MSG = 'Disimpan secara lokal (Mode Offline)';
type Filter = 'semua' | AktivitasTipe;

interface DateGroup {
  date: string;
  label: string;
  items: AktivitasLocal[];
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dateStr === today.toISOString().slice(0, 10)) return 'Hari Ini';
  if (dateStr === yesterday.toISOString().slice(0, 10)) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AktivitasListPage(): React.JSX.Element {
  const [items, setItems] = useState<AktivitasLocal[]>([]);
  const [lahanMap, setLahanMap] = useState<Map<string, LahanLocal>>(new Map());
  const [lahanOptions, setLahanOptions] = useState<LahanLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('semua');
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AktivitasLocal | null>(null);
  const refreshCounts = useSyncStore((s) => s.refreshCounts);

  const reload = useCallback(async (): Promise<void> => {
    const [aktivitas, lahan] = await Promise.all([aktivitasRepo.list(), lahanRepo.list()]);
    setItems(aktivitas);
    setLahanOptions(lahan);
    setLahanMap(new Map(lahan.map((l) => [l.client_uuid, l])));
  }, []);

  const sync = useCallback(async (): Promise<void> => {
    if (!navigator.onLine) return;
    try {
      await hydrateFromServer();
      await reload();
    } catch {/* pakai data lokal */}
  }, [reload]);

  useIonViewWillEnter(() => {
    void (async (): Promise<void> => {
      await reload();
      setLoading(false);
      await sync();
    })();
  });

  const filtered = useMemo(
    () => (filter === 'semua' ? items : items.filter((a) => a.tipe === filter)),
    [items, filter],
  );

  // Group by date
  const dateGroups = useMemo<DateGroup[]>(() => {
    const map = new Map<string, AktivitasLocal[]>();
    for (const a of filtered) {
      const date = a.tanggal.slice(0, 10);
      const arr = map.get(date) ?? [];
      arr.push(a);
      map.set(date, arr);
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, groupItems]) => ({ date, label: formatDateLabel(date), items: groupItems }));
  }, [filtered]);

  // Stats
  const stats = useMemo(() => {
    const semai = items.filter((a) => a.tipe === 'semai').length;
    const pindah = items.filter((a) => a.tipe === 'pindah_tanam').length;
    const pupuk = items.filter((a) => a.tipe === 'pemupukan').length;
    const pesti = items.filter((a) => a.tipe === 'pestisida').length;
    return { total: items.length, semai, pindah, pupuk, pesti };
  }, [items]);

  const handleSubmit = async (input: AktivitasInput): Promise<void> => {
    await aktivitasRepo.create(input);
    await reload();
    await refreshCounts();
    if (navigator.onLine) void runSync().then(reload);
    else setToast(OFFLINE_MSG);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!toDelete) return;
    await aktivitasRepo.remove(toDelete.client_uuid);
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
          <IonButtons slot="start"><AccountButton /></IonButtons>
          <IonTitle>Aktivitas</IonTitle>
          <IonButtons slot="end"><SyncIndicator /></IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={(e) => void sync().then(() => e.detail.complete())}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="px-4 pb-24 pt-2">
          {loading ? (
            <CardSkeleton count={5} hero />
          ) : (
            <>
              {/* ═══ HERO STATS ═══ */}
              {items.length > 0 && (
                <div className="kbn-hero kbn-fade-up p-5 mb-5">
                  <div className="relative z-10">
                    <div className="flex items-center gap-1.5 text-white/70">
                      <IonIcon icon={calendarOutline} className="text-base" />
                      <span className="text-[0.75rem] font-semibold tracking-wide uppercase">Catatan Aktivitas</span>
                    </div>
                    <p className="text-[2rem] font-extrabold mt-1 leading-none">
                      {stats.total} <span className="text-[1rem] font-semibold text-white/70">aktivitas</span>
                    </p>
                    <div className="grid grid-cols-4 gap-1.5 mt-4 pt-3.5 border-t border-white/15">
                      <div className="text-center">
                        <div className="w-7 h-7 rounded-lg bg-[#FEF3C7]/20 flex items-center justify-center mx-auto mb-1">
                          <IonIcon icon={leafOutline} className="text-[#FCD34D] text-sm" />
                        </div>
                        <p className="text-[0.9rem] font-bold">{stats.semai}</p>
                        <p className="text-[0.55rem] text-white/60">Semai</p>
                      </div>
                      <div className="text-center">
                        <div className="w-7 h-7 rounded-lg bg-[#86efac]/20 flex items-center justify-center mx-auto mb-1">
                          <IonIcon icon={swapHorizontalOutline} className="text-[#86efac] text-sm" />
                        </div>
                        <p className="text-[0.9rem] font-bold">{stats.pindah}</p>
                        <p className="text-[0.55rem] text-white/60">Pindah</p>
                      </div>
                      <div className="text-center">
                        <div className="w-7 h-7 rounded-lg bg-[#BAE6FD]/20 flex items-center justify-center mx-auto mb-1">
                          <IonIcon icon={flaskOutline} className="text-[#7dd3fc] text-sm" />
                        </div>
                        <p className="text-[0.9rem] font-bold">{stats.pupuk}</p>
                        <p className="text-[0.55rem] text-white/60">Pupuk</p>
                      </div>
                      <div className="text-center">
                        <div className="w-7 h-7 rounded-lg bg-[#FECDD3]/20 flex items-center justify-center mx-auto mb-1">
                          <IonIcon icon={bugOutline} className="text-[#fca5a5] text-sm" />
                        </div>
                        <p className="text-[0.9rem] font-bold">{stats.pesti}</p>
                        <p className="text-[0.55rem] text-white/60">Pestisida</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ FILTER ═══ */}
              {items.length > 0 && (
                <div className="mb-4 kbn-fade-up" style={{ animationDelay: '0.06s' }}>
                  <IonSegment
                    className="kbn-segment"
                    value={filter}
                    onIonChange={(e) => setFilter((e.detail.value as Filter) ?? 'semua')}
                    scrollable
                  >
                    <IonSegmentButton value="semua"><IonLabel>Semua</IonLabel></IonSegmentButton>
                    <IonSegmentButton value="semai"><IonLabel>Semai</IonLabel></IonSegmentButton>
                    <IonSegmentButton value="pindah_tanam"><IonLabel>Pindah</IonLabel></IonSegmentButton>
                    <IonSegmentButton value="pemupukan"><IonLabel>Pupuk</IonLabel></IonSegmentButton>
                    <IonSegmentButton value="pestisida"><IonLabel>Pestisida</IonLabel></IonSegmentButton>
                  </IonSegment>
                </div>
              )}

              {/* ═══ TIMELINE LIST ═══ */}
              {items.length === 0 ? (
                <EmptyState
                  icon={documentTextOutline}
                  title="Belum ada aktivitas"
                  subtitle="Catat semai, pindah tanam, atau pemupukan pada lahan Anda."
                  actionLabel="Catat Aktivitas"
                  onAction={() => setModalOpen(true)}
                />
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-body text-slate-muted">Tidak ada aktivitas tipe ini.</p>
                </div>
              ) : (
                <div className="kbn-fade-up" style={{ animationDelay: '0.1s' }}>
                  {dateGroups.map((group) => (
                    <div key={group.date} className="mb-5">
                      {/* Date header */}
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                          <IonIcon icon={calendarOutline} className="text-slate-muted text-xs" />
                        </div>
                        <span className="text-[0.78rem] font-bold text-slate-dark">{group.label}</span>
                        <span className="text-[0.65rem] text-slate-muted">· {group.items.length}</span>
                        <div className="flex-1 h-px bg-slate-100 ml-2" />
                      </div>
                      {/* Items with timeline line */}
                      <div className="pl-3 border-l-2 border-slate-100 ml-[11px] space-y-0">
                        {group.items.map((a) => (
                          <AktivitasItem
                            key={a.client_uuid}
                            aktivitas={a}
                            lahan={lahanMap.get(a.lahan_uuid)}
                            onDelete={setToDelete}
                          />
                        ))}
                      </div>
                    </div>
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

        <AktivitasFormModal
          isOpen={modalOpen}
          lahanOptions={lahanOptions}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />

        <IonAlert
          isOpen={toDelete !== null}
          header="Hapus aktivitas?"
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
