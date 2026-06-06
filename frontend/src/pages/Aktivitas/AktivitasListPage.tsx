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
import { add, documentTextOutline } from 'ionicons/icons';
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

  const filtered = useMemo(
    () => (filter === 'semua' ? items : items.filter((a) => a.tipe === filter)),
    [items, filter],
  );

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
          <IonButtons slot="start">
            <AccountButton />
          </IonButtons>
          <IonTitle>Aktivitas</IonTitle>
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
              Aktivitas
            </IonTitle>
          </IonToolbar>
        </IonHeader>

        <div className="px-4">
          <p className="text-caption text-slate-muted -mt-1 mb-2">Riwayat seluruh aktivitas kebun Anda</p>
          {items.length > 0 && (
            <IonSegment
              className="kbn-segment mb-3"
              value={filter}
              onIonChange={(e) => setFilter((e.detail.value as Filter) ?? 'semua')}
              scrollable
            >
              <IonSegmentButton value="semua">
                <IonLabel>Semua</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="semai">
                <IonLabel>Semai</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="pindah_tanam">
                <IonLabel>Pindah</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="pemupukan">
                <IonLabel>Pupuk</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="pestisida">
                <IonLabel>Pestisida</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          )}

          {loading ? (
            <CardSkeleton count={5} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={documentTextOutline}
              title="Belum ada aktivitas"
              subtitle="Catat semai, pindah tanam, atau pemupukan pada lahan Anda."
              actionLabel="Catat Aktivitas"
              onAction={() => setModalOpen(true)}
            />
          ) : filtered.length === 0 ? (
            <p className="text-center text-body text-slate-muted mt-10">Tidak ada aktivitas tipe ini.</p>
          ) : (
            <div className="kbn-stagger pb-24">
              {filtered.map((a) => (
                <AktivitasItem
                  key={a.client_uuid}
                  aktivitas={a}
                  lahan={lahanMap.get(a.lahan_uuid)}
                  onDelete={setToDelete}
                />
              ))}
            </div>
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
