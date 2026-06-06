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
  IonRefresher,
  IonRefresherContent,
  useIonViewWillEnter,
  useIonRouter,
} from '@ionic/react';
import { add, leafOutline, layersOutline, swapVerticalOutline } from 'ionicons/icons';
import type { LahanLocal } from '../../db';
import { lahanRepo, type LahanInput } from '../../db/repository';
import { runSync } from '../../sync/SyncEngine';
import { hydrateFromServer } from '../../sync/hydrate';
import { useSyncStore } from '../../store/syncStore';
import { SyncIndicator } from '../../components/SyncIndicator';
import { AccountButton } from '../../components/AccountButton';
import { EmptyState } from '../../components/EmptyState';
import { CardSkeleton } from '../../components/CardSkeleton';
import { CommodityAvatar } from '../../components/CommodityAvatar';
import { LahanCard } from './LahanCard';
import { LahanFormModal } from './LahanFormModal';

const OFFLINE_MSG = 'Disimpan secara lokal (Mode Offline)';

type SortMode = 'newest' | 'az' | 'za';
const SORT_LABEL: Record<SortMode, string> = { newest: 'Terbaru', az: 'A → Z', za: 'Z → A' };

interface Group {
  key: string;
  nama: string;
  items: LahanLocal[];
}

export default function LahanListPage(): React.JSX.Element {
  const router = useIonRouter();
  const [items, setItems] = useState<LahanLocal[]>([]);
  const [komoditasOptions, setKomoditasOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [grouped, setGrouped] = useState(false);
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
    } catch {
      /* offline / gagal — pakai data lokal */
    }
  }, [reload]);

  useIonViewWillEnter(() => {
    void (async (): Promise<void> => {
      await reload();
      setLoading(false);
      await sync();
    })();
  });

  // 1) filter pencarian
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (l) => l.komoditas.toLowerCase().includes(q) || l.nomor_bed.toLowerCase().includes(q),
    );
  }, [items, query]);

  // 2) urutkan
  const sorted = useMemo(() => {
    const copy = [...filtered];
    const byBed = (a: LahanLocal, b: LahanLocal): number =>
      a.nomor_bed.localeCompare(b.nomor_bed, 'id', { numeric: true });
    if (sort === 'az') {
      copy.sort((a, b) => a.komoditas.localeCompare(b.komoditas, 'id') || byBed(a, b));
    } else if (sort === 'za') {
      copy.sort((a, b) => b.komoditas.localeCompare(a.komoditas, 'id') || byBed(a, b));
    } else {
      copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return copy;
  }, [filtered, sort]);

  // 3) kelompokkan per jenis tanaman (jika aktif)
  const groups = useMemo<Group[]>(() => {
    if (!grouped) return [];
    const map = new Map<string, Group>();
    for (const l of sorted) {
      const key = l.komoditas.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) existing.items.push(l);
      else map.set(key, { key, nama: l.komoditas.trim(), items: [l] });
    }
    const arr = [...map.values()];
    if (sort === 'za') arr.sort((a, b) => b.nama.localeCompare(a.nama, 'id'));
    else if (sort === 'az') arr.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    return arr;
  }, [grouped, sorted, sort]);

  const aktifCount = useMemo(() => items.filter((l) => l.status === 'aktif').length, [items]);

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

  const openNew = (): void => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (lahan: LahanLocal): void => {
    setEditing(lahan);
    setModalOpen(true);
  };

  const summary =
    items.length === 0 ? 'Kelola tanaman di tiap bedengan' : `${items.length} tanaman · ${aktifCount} aktif`;

  const pill = (active: boolean): string =>
    `flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors ${
      active ? 'border-emerald bg-emerald/10 text-emerald-deep' : 'border-slate-200 bg-white text-slate-dark'
    }`;

  const renderCard = (lahan: LahanLocal): React.JSX.Element => (
    <LahanCard
      key={lahan.client_uuid}
      lahan={lahan}
      onOpen={openDetail}
      onEdit={openEdit}
      onDelete={setToDelete}
    />
  );

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <AccountButton />
          </IonButtons>
          <IonTitle>Tanaman</IonTitle>
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
              Tanaman
            </IonTitle>
          </IonToolbar>
        </IonHeader>

        <div className="px-4">
          <p className="text-caption text-slate-muted -mt-1 mb-2">{summary}</p>

          {items.length > 0 && (
            <>
              <IonSearchbar
                className="kbn-search"
                value={query}
                onIonInput={(e) => setQuery(e.detail.value ?? '')}
                placeholder="Cari tanaman / bed"
                debounce={120}
              />

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
              </div>
            </>
          )}

          {loading ? (
            <CardSkeleton count={4} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={leafOutline}
              title="Belum ada tanaman"
              subtitle="Tambahkan tanaman pertama Anda untuk mulai mencatat perawatan."
              actionLabel="Tambah Tanaman"
              onAction={openNew}
            />
          ) : sorted.length === 0 ? (
            <p className="text-center text-body text-slate-muted mt-10">Tidak ada hasil untuk “{query}”.</p>
          ) : grouped ? (
            <div className="pb-24">
              {groups.map((g) => (
                <div key={g.key} className="mb-4">
                  <div className="flex items-center gap-2 px-1 mb-2">
                    <CommodityAvatar komoditas={g.nama} className="!w-7 !h-7 !text-base !rounded-lg" />
                    <span className="text-heading-md text-slate-dark">{g.nama}</span>
                    <span className="text-caption text-slate-muted">· {g.items.length}</span>
                  </div>
                  <div className="kbn-stagger">{g.items.map(renderCard)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="kbn-stagger pb-24">{sorted.map(renderCard)}</div>
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
