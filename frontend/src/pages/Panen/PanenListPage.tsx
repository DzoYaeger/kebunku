import { useState, useCallback } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonButtons,
  IonBackButton,
  IonButton,
  useIonViewWillEnter,
  useIonToast,
  IonAlert,
} from '@ionic/react';
import { add, downloadOutline } from 'ionicons/icons';
import { db, type PanenLocal, type LahanLocal } from '../../db';
import { panenRepo, type PanenInput } from '../../db/repository';
import { PanenFormModal } from './PanenFormModal';
import { api } from '../../api/client';
import { SyncIndicator } from '../../components/SyncIndicator';

const IDR = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

export default function PanenListPage(): React.JSX.Element {
  const [items, setItems] = useState<PanenLocal[]>([]);
  const [lahanMap, setLahanMap] = useState<Map<string, LahanLocal>>(new Map());
  const [lahanOptions, setLahanOptions] = useState<LahanLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [present] = useIonToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    const [panen, lahan] = await Promise.all([panenRepo.list(), db.lahan.toArray()]);
    const map = new Map<string, LahanLocal>();
    lahan.forEach(l => map.set(l.client_uuid, l));
    setLahanMap(map);
    setItems(panen);
    setLahanOptions(lahan.filter(l => l.status !== 'selesai'));
    setLoading(false);
  }, []);

  useIonViewWillEnter(() => { void fetch(); });

  const handleRefresh = async (e: CustomEvent): Promise<void> => {
    await fetch();
    (e.target as HTMLIonRefresherElement).complete();
  };

  const handleCreate = async (input: PanenInput): Promise<void> => {
    await panenRepo.create(input);
    await fetch();
    void present({ message: navigator.onLine ? 'Panen tersimpan.' : 'Disimpan secara lokal (Mode Offline)', duration: 2000, position: 'top', color: navigator.onLine ? 'success' : 'warning' });
  };

  const handleDelete = async (): Promise<void> => {
    if (deleteTarget) {
      await panenRepo.remove(deleteTarget);
      setDeleteTarget(null);
      await fetch();
      void present({ message: 'Panen dihapus.', duration: 2000, position: 'top', color: 'medium' });
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const res = await api.get('/export/panen', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'export_panen_kebunku.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      void present({ message: 'Gagal mengunduh export. Pastikan online.', duration: 3000, position: 'top', color: 'danger' });
    }
  };

  // Hitung total
  const totalBerat = items.reduce((sum, p) => sum + Number(p.berat), 0);
  const totalPendapatan = items.reduce((sum, p) => {
    const harga = Number(p.harga_jual ?? 0);
    return sum + harga * Number(p.berat);
  }, 0);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/app/dashboard" />
          </IonButtons>
          <IonTitle>🌾 Panen</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleExport}>
              <IonIcon icon={downloadOutline} slot="icon-only" />
            </IonButton>
            <SyncIndicator />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <IonSpinner name="crescent" color="primary" />
          </div>
        ) : (
          <div className="px-4 pb-24 pt-2 space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-caption text-emerald-600">Total Panen</p>
                <p className="text-sm font-bold text-emerald-700">{totalBerat.toFixed(1)} kg</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <p className="text-caption text-blue-600">Total Pendapatan</p>
                <p className="text-sm font-bold text-blue-700">{IDR.format(totalPendapatan)}</p>
              </div>
            </div>

            {items.length === 0 ? (
              <p className="text-center text-slate-400 text-sm mt-12">
                Belum ada catatan panen. Tap + untuk mencatat panen.
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => {
                  const lahan = lahanMap.get(item.lahan_uuid);
                  const total = Number(item.harga_jual ?? 0) * Number(item.berat);
                  return (
                    <div
                      key={item.client_uuid}
                      className="rounded-xl border border-slate-200 bg-white p-3"
                      onClick={() => setDeleteTarget(item.client_uuid)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {lahan?.icon || '🌱'} Bed {lahan?.nomor_bed ?? '?'} · {lahan?.komoditas ?? '?'}
                          </p>
                          <p className="text-caption text-slate-500">
                            {item.tanggal} · {Number(item.berat).toFixed(1)} kg
                            {item.grade ? ` · ${item.grade}` : ''}
                            {item.pembeli ? ` · ${item.pembeli}` : ''}
                          </p>
                        </div>
                        {item.harga_jual && (
                          <p className="text-sm font-bold text-emerald-700 ml-2">
                            {IDR.format(total)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed" className="mb-14 mr-2">
          <IonFabButton onClick={() => setShowForm(true)} color="primary">
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <PanenFormModal
          isOpen={showForm}
          lahanOptions={lahanOptions}
          onClose={() => setShowForm(false)}
          onSubmit={handleCreate}
        />

        <IonAlert
          isOpen={deleteTarget !== null}
          onDidDismiss={() => setDeleteTarget(null)}
          header="Hapus Panen"
          message="Yakin ingin menghapus catatan panen ini?"
          buttons={[
            { text: 'Batal', role: 'cancel' },
            { text: 'Hapus', role: 'destructive', handler: () => { void handleDelete(); } },
          ]}
        />
      </IonContent>
    </IonPage>
  );
}
