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
  IonSearchbar,
  IonActionSheet,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  useIonViewWillEnter,
  useIonRouter,
} from '@ionic/react';
import { add, leafOutline, layersOutline, swapVerticalOutline, sparklesOutline, checkmarkCircleOutline, chevronDownOutline, chevronUpOutline } from 'ionicons/icons';
import type { LahanLocal } from '../../db';
import { lahanRepo, type LahanInput } from '../../db/repository';
import { runSync } from '../../sync/SyncEngine';
import { hydrateFromServer } from '../../sync/hydrate';
import { useSyncStore } from '../../store/syncStore';
import { useAuthStore } from '../../store/authStore';
import { SyncIndicator } from '../../components/SyncIndicator';
import { AccountButton } from '../../components/AccountButton';
import { EmptyState } from '../../components/EmptyState';
import { CardSkeleton } from '../../components/CardSkeleton';
import { CommodityAvatar } from '../../components/CommodityAvatar';
import { LahanCard } from './LahanCard';
import { LahanFormModal } from './LahanFormModal';

const OFFLINE_MSG = 'Disimpan secara lokal (Mode Offline)';

type SortMode = 'newest' | 'az' | 'za';
type StatusFilter = 'semua' | 'semai' | 'aktif' | 'selesai';
const SORT_LABEL: Record<SortMode, string> = { newest: 'Terbaru', az: 'A → Z', za: 'Z → A' };

interface Group {
  key: string;
  nama: string;
  items: LahanLocal[];
}

export default function LahanListPage(): React.JSX.Element {
  const router = useIonRouter();
  const userName = useAuthStore((s) => s.user?.name);
  const [items, setItems] = useState<LahanLocal[]>([]);
  const [komoditasOptions, setKomoditasOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [grouped, setGrouped] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('semua');
  const [sort, setSort] = useState<SortMode>('newest');
  const [sortSheet, setSortSheet] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LahanLocal | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<LahanLocal | null>(null);
  const refreshCounts = useSyncStore((s) => s.refreshCounts);

  const reload = useCallback(async (): Promise<void> => {
    const [list, komoditas] = await Promise.all([lahanRepo.list(), lahanRepo.komoditasList()]);
    setItems(list);
    setKomoditasOptions(komoditas);
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

  const stats = useMemo(() => {
    const semai = items.filter((l) => l.status === 'semai').length;
    const aktif = items.filter((l) => l.status === 'aktif').length;
    const selesai = items.filter((l) => l.status === 'selesai').length;
    return { total: items.length, semai, aktif, selesai, komoditas: komoditasOptions.length };
  }, [items, komoditasOptions]);

  // 1) filter status
  const statusFiltered = useMemo(() => {
    if (statusFilter === 'semua') return items;
    return items.filter((l) => l.status === statusFilter);
  }, [items, statusFilter]);

  // 2) filter pencarian
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return statusFiltered;
    return statusFiltered.filter(
      (l) => l.komoditas.toLowerCase().includes(q) || l.nomor_bed.toLowerCase().includes(q),
    );
  }, [statusFiltered, query]);

  // 3) urutkan
  const sorted = useMemo(() => {
    const copy = [...filtered];
    const byBed = (a: LahanLocal, b: LahanLocal): number =>
      a.nomor_bed.localeCompare(b.nomor_bed, 'id', { numeric: true });
    if (sort === 'az') copy.sort((a, b) => a.komoditas.localeCompare(b.komoditas, 'id') || byBed(a, b));
    else if (sort === 'za') copy.sort((a, b) => b.komoditas.localeCompare(a.komoditas, 'id') || byBed(a, b));
    else copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return copy;
  }, [filtered, sort]);

  // 4) kelompokkan
  const groups = useMemo<Group[]>(() => {
    if (!grouped) return [];
    const map = new Map<string, Group>();
    for (const l of sorted) {
      const key = l.komoditas.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) existing.items.push(l);
      else map.set(key, { key, nama: l.komoditas.trim(), items: [l] });
    }
    return [...map.values()];
  }, [grouped, sorted]);

  const openDetail = (lahan: LahanLocal): void => {
    router.push(`/app/tanaman/${lahan.client_uuid}`, 'forward', 'push');
  };

  const handleSubmit = async (input: LahanInput, editingItem: LahanLocal | null): Promise<void> => {
    if (editingItem) await lahanRepo.update(editingItem.client_uuid, input);
    else await lahanRepo.create(input);
    await reload();
    await refreshCounts();
    if (navigator.onLine) void runSync().then(reload);
    else setToast(OFFLINE_MSG);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!toDelete) return;
    await lahanRepo.remove(toDelete.client_uuid);
    setToDelete(null);
    await reload();
    await refreshCounts();
    if (navigator.onLine) void runSync().then(reload);
    else setToast(OFFLINE_MSG);
  };

  const openNew = (): void => { setEditing(null); setModalOpen(true); };
  const openEdit = (lahan: LahanLocal): void => { setEditing(lahan); setModalOpen(true); };

  const pill = (active: boolean): string =>
    `flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors ${
      active ? 'border-emerald bg-emerald/10 text-emerald-deep' : 'border-slate-200 bg-white text-slate-dark'
    }`;

  const renderCard = (lahan: LahanLocal): React.JSX.Element => (
    <LahanCard key={lahan.client_uuid} lahan={lahan} onOpen={openDetail} onEdit={openEdit} onDelete={setToDelete} />
  );

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><AccountButton /></IonButtons>
          <IonTitle>{userName ? `Halo, ${userName}` : 'Tanaman'}</IonTitle>
          <IonButtons slot="end"><SyncIndicator /></IonButtons>
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
              {/* ═══ HERO STATS ═══ */}
              {items.length > 0 && (
                <div className="kbn-hero kbn-fade-up p-5 mb-5">
                  <div className="relative z-10">
                    <div className="flex items-center gap-1.5 text-white/70">
                      <IonIcon icon={leafOutline} className="text-base" />
                      <span className="text-[0.75rem] font-semibold tracking-wide uppercase">Kebun Saya</span>
                    </div>
                    <p className="text-[2rem] font-extrabold mt-1 leading-none">
                      {stats.total} <span className="text-[1rem] font-semibold text-white/70">tanaman</span>
                    </p>
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-white/15">
                      <div className="text-center">
                        <div className="w-8 h-8 rounded-xl bg-[#FEF3C7]/20 flex items-center justify-center mx-auto mb-1">
                          <IonIcon icon={sparklesOutline} className="text-[#FCD34D] text-lg" />
                        </div>
                        <p className="text-[1rem] font-bold">{stats.semai}</p>
                        <p className="text-[0.6rem] text-white/60">Semai</p>
                      </div>
                      <div className="text-center">
                        <div className="w-8 h-8 rounded-xl bg-[#86efac]/20 flex items-center justify-center mx-auto mb-1">
                          <IonIcon icon={leafOutline} className="text-[#86efac] text-lg" />
                        </div>
                        <p className="text-[1rem] font-bold">{stats.aktif}</p>
                        <p className="text-[0.6rem] text-white/60">Aktif</p>
                      </div>
                      <div className="text-center">
                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-1">
                          <IonIcon icon={checkmarkCircleOutline} className="text-white/70 text-lg" />
                        </div>
                        <p className="text-[1rem] font-bold">{stats.selesai}</p>
                        <p className="text-[0.6rem] text-white/60">Selesai</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ SEARCH & CONTROLS ═══ */}
              {items.length > 0 && (
                <>
                  <IonSearchbar
                    className="kbn-search"
                    value={query}
                    onIonInput={(e) => setQuery(e.detail.value ?? '')}
                    placeholder="Cari tanaman / bed"
                    debounce={120}
                  />

                  {/* Status filter */}
                  <IonSegment
                    className="kbn-segment mb-3"
                    value={statusFilter}
                    onIonChange={(e) => setStatusFilter((e.detail.value as StatusFilter) ?? 'semua')}
                    scrollable
                  >
                    <IonSegmentButton value="semua"><IonLabel>Semua</IonLabel></IonSegmentButton>
                    <IonSegmentButton value="semai"><IonLabel>Semai</IonLabel></IonSegmentButton>
                    <IonSegmentButton value="aktif"><IonLabel>Aktif</IonLabel></IonSegmentButton>
                    <IonSegmentButton value="selesai"><IonLabel>Selesai</IonLabel></IonSegmentButton>
                  </IonSegment>

                  {/* Kontrol Grup & Urutkan */}
                  <div className="flex items-center gap-2 mb-3">
                    <button type="button" className={pill(grouped)} onClick={() => setGrouped((g) => !g)}>
                      <IonIcon icon={layersOutline} className="text-sm" />
                      Grup
                    </button>
                    <button type="button" className={pill(false)} onClick={() => setSortSheet(true)}>
                      <IonIcon icon={swapVerticalOutline} className="text-sm" />
                      {SORT_LABEL[sort]}
                    </button>
                    <span className="ml-auto text-[0.7rem] text-slate-muted font-medium">
                      {sorted.length} hasil
                    </span>
                  </div>
                </>
              )}

              {/* ═══ LIST ═══ */}
              {items.length === 0 ? (
                <EmptyState
                  icon={leafOutline}
                  title="Belum ada tanaman"
                  subtitle="Tambahkan tanaman pertama Anda untuk mulai mencatat perawatan."
                  actionLabel="Tambah Tanaman"
                  onAction={openNew}
                />
              ) : sorted.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-body text-slate-muted">Tidak ada hasil untuk pencarian ini.</p>
                </div>
              ) : grouped ? (
                <div>
                  {groups.map((g) => {
                    const isCollapsed = collapsedGroups.has(g.key);
                    const toggleCollapse = (): void => {
                      setCollapsedGroups((prev) => {
                        const next = new Set(prev);
                        if (next.has(g.key)) next.delete(g.key);
                        else next.add(g.key);
                        return next;
                      });
                    };
                    return (
                      <div key={g.key} className="mb-4">
                        <button
                          type="button"
                          onClick={toggleCollapse}
                          className="flex items-center gap-2.5 px-1 mb-2 w-full text-left"
                        >
                          <CommodityAvatar komoditas={g.nama} className="!w-8 !h-8 !text-lg !rounded-xl" />
                          <div className="flex-1">
                            <span className="text-[0.88rem] font-bold text-slate-dark">{g.nama}</span>
                            <p className="text-[0.65rem] text-slate-muted">{g.items.length} bedengan</p>
                          </div>
                          <IonIcon
                            icon={isCollapsed ? chevronDownOutline : chevronUpOutline}
                            className="text-slate-muted text-lg"
                          />
                        </button>
                        {!isCollapsed && (
                          <div className="kbn-stagger">{g.items.map(renderCard)}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="kbn-stagger">{sorted.map(renderCard)}</div>
              )}
            </>
          )}
        </div>

        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton onClick={openNew}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonActionSheet
          isOpen={sortSheet}
          header="Urutkan tanaman"
          buttons={[
            { text: 'Terbaru', handler: () => setSort('newest') },
            { text: 'Nama A → Z', handler: () => setSort('az') },
            { text: 'Nama Z → A', handler: () => setSort('za') },
            { text: 'Batal', role: 'cancel' },
          ]}
          onDidDismiss={() => setSortSheet(false)}
        />

        <LahanFormModal
          isOpen={modalOpen}
          editing={editing}
          komoditasOptions={komoditasOptions}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />

        <IonAlert
          isOpen={toDelete !== null}
          header="Hapus tanaman?"
          message={toDelete ? `Bed ${toDelete.nomor_bed} (${toDelete.komoditas}) akan dihapus.` : ''}
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
