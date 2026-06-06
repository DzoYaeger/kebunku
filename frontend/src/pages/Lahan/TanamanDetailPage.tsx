import { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonIcon,
  IonButton,
  IonToast,
  IonAlert,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  flaskOutline,
  leafOutline,
  swapHorizontalOutline,
  bugOutline,
  nutritionOutline,
  trashOutline,
} from 'ionicons/icons';
import type { LahanLocal, AktivitasLocal } from '../../db';
import type { AktivitasTipe } from '../../types';
import { lahanRepo, aktivitasRepo } from '../../db/repository';
import { runSync } from '../../sync/SyncEngine';
import { useSyncStore } from '../../store/syncStore';
import { StatusBadge } from '../../components/StatusBadge';
import { CommodityAvatar } from '../../components/CommodityAvatar';
import { formatTanggal } from '../../utils/format';
import { AplikasiBahanModal, type BahanInput } from './AplikasiBahanModal';

const OFFLINE_MSG = 'Disimpan secara lokal (Mode Offline)';

const PUPUK_SUGGESTIONS = [
  'NPK 16-16-16',
  'MKP',
  'Ultradap',
  'Boron',
  'Magnesium',
  'Urea',
  'KCl',
  'Pupuk Kandang',
  'Kompos',
  'Organik Cair',
  'ZA',
];

const TIPE_META: Record<AktivitasTipe, { label: string; icon: string; bg: string; fg: string }> = {
  semai: { label: 'Semai', icon: leafOutline, bg: '#FEF3C7', fg: '#B45309' },
  pindah_tanam: { label: 'Pindah Tanam', icon: swapHorizontalOutline, bg: '#DCFCE7', fg: '#15803D' },
  pemupukan: { label: 'Pemupukan', icon: flaskOutline, bg: '#E0F2FE', fg: '#0369A1' },
  pestisida: { label: 'Pestisida', icon: bugOutline, bg: '#FFE4E6', fg: '#BE123C' },
};

// Pisah string "A, B, C" menjadi chip individual.
function splitBahan(s: string | null): string[] {
  if (!s) return [];
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

type Mode = 'pupuk' | 'pestisida' | null;

export default function TanamanDetailPage(): React.JSX.Element {
  const { uuid } = useParams<{ uuid: string }>();
  const [lahan, setLahan] = useState<LahanLocal | null>(null);
  const [aktivitas, setAktivitas] = useState<AktivitasLocal[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AktivitasLocal | null>(null);
  const refreshCounts = useSyncStore((s) => s.refreshCounts);

  const reload = useCallback(async (): Promise<void> => {
    const l = await lahanRepo.get(uuid);
    if (!l) {
      setNotFound(true);
      return;
    }
    setLahan(l);
    setAktivitas(await aktivitasRepo.listByLahan(uuid));
  }, [uuid]);

  useIonViewWillEnter(() => {
    void reload();
  });

  const pemupukan = useMemo(() => aktivitas.filter((a) => a.tipe === 'pemupukan'), [aktivitas]);
  const pestisida = useMemo(() => aktivitas.filter((a) => a.tipe === 'pestisida'), [aktivitas]);
  const lainnya = useMemo(
    () => aktivitas.filter((a) => a.tipe === 'semai' || a.tipe === 'pindah_tanam'),
    [aktivitas],
  );

  // Saran jenis pupuk: bawaan + yang pernah dipakai.
  const pupukOptions = useMemo(() => {
    const used = pemupukan.flatMap((p) => splitBahan(p.jenis_pupuk));
    return Array.from(new Set([...PUPUK_SUGGESTIONS, ...used]));
  }, [pemupukan]);

  const handleSubmit = async (input: BahanInput): Promise<void> => {
    const joined = input.bahan.join(', ');
    await aktivitasRepo.create({
      lahan_uuid: uuid,
      tipe: mode === 'pestisida' ? 'pestisida' : 'pemupukan',
      tanggal: input.tanggal,
      jenis_pupuk: mode === 'pupuk' ? joined : null,
      jenis_pestisida: mode === 'pestisida' ? joined : null,
      catatan: input.catatan,
    });
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

  const renderBahanItem = (
    a: AktivitasLocal,
    bahan: string[],
    icon: string,
    bg: string,
    fg: string,
  ): React.JSX.Element => (
    <IonItemSliding key={a.client_uuid}>
      <div className="kbn-card p-3.5 flex items-start gap-3 mb-3">
        <div className="kbn-avatar shrink-0" style={{ background: bg, color: fg }}>
          <IonIcon icon={icon} className="text-xl" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            {bahan.length > 0 ? (
              bahan.map((b) => (
                <span key={b} className="badge" style={{ background: bg, color: fg }}>
                  {b}
                </span>
              ))
            ) : (
              <span className="text-heading-md text-slate-dark">—</span>
            )}
          </div>
          <p className="text-caption text-slate-muted mt-1.5">
            {formatTanggal(a.tanggal)}
            {a.catatan ? ` · ${a.catatan}` : ''}
          </p>
        </div>
      </div>
      <IonItemOptions side="end">
        <IonItemOption color="danger" onClick={() => setToDelete(a)}>
          <IonIcon slot="icon-only" icon={trashOutline} />
        </IonItemOption>
      </IonItemOptions>
    </IonItemSliding>
  );

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/app/tanaman" text="Tanaman" />
          </IonButtons>
          <IonTitle>{lahan?.komoditas ?? 'Detail'}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {notFound ? (
          <div className="text-center text-slate-muted mt-24 px-8">
            <p className="text-body">Tanaman tidak ditemukan atau sudah dihapus.</p>
          </div>
        ) : lahan ? (
          <div className="px-4 pt-2 pb-28">
            {/* Header tanaman */}
            <div className="kbn-card kbn-fade-up p-4 flex items-center gap-3.5 mb-4">
              <CommodityAvatar komoditas={lahan.komoditas} className="!w-14 !h-14 !text-2xl !rounded-2xl" />
              <div className="min-w-0 flex-1">
                <h1 className="text-heading-lg text-slate-dark truncate">{lahan.komoditas}</h1>
                <p className="text-caption text-slate-muted mt-0.5">Bed {lahan.nomor_bed}</p>
              </div>
              <StatusBadge status={lahan.status} />
            </div>

            {/* Ringkasan */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="kbn-card kbn-fade-up p-3.5">
                <div className="flex items-center gap-1.5 text-slate-muted">
                  <IonIcon icon={nutritionOutline} className="text-sm" />
                  <span className="text-caption">Pemupukan</span>
                </div>
                <p className="text-heading-lg text-slate-dark mt-1">{pemupukan.length}×</p>
              </div>
              <div className="kbn-card kbn-fade-up p-3.5">
                <div className="flex items-center gap-1.5 text-slate-muted">
                  <IonIcon icon={bugOutline} className="text-sm" />
                  <span className="text-caption">Pestisida</span>
                </div>
                <p className="text-heading-lg text-slate-dark mt-1">{pestisida.length}×</p>
              </div>
            </div>

            {lahan.catatan && (
              <div className="kbn-card p-3.5 mb-4">
                <p className="text-caption text-slate-muted">Catatan</p>
                <p className="text-body text-slate-dark mt-1">{lahan.catatan}</p>
              </div>
            )}

            {/* Aksi */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <IonButton onClick={() => setMode('pupuk')}>
                <IonIcon slot="start" icon={flaskOutline} />
                Beri Pupuk
              </IonButton>
              <IonButton fill="outline" onClick={() => setMode('pestisida')}>
                <IonIcon slot="start" icon={bugOutline} />
                Pestisida
              </IonButton>
            </div>

            {/* Riwayat Pemupukan */}
            <h2 className="text-heading-md text-slate-dark mb-2 px-1">Riwayat Pemupukan</h2>
            {pemupukan.length === 0 ? (
              <div className="kbn-card p-5 text-center text-slate-muted mb-5">
                <IonIcon icon={flaskOutline} className="text-3xl mb-2" />
                <p className="text-body">Belum ada pemupukan.</p>
              </div>
            ) : (
              <div className="kbn-stagger mb-5">
                {pemupukan.map((p) =>
                  renderBahanItem(p, splitBahan(p.jenis_pupuk), flaskOutline, '#E0F2FE', '#0369A1'),
                )}
              </div>
            )}

            {/* Riwayat Pestisida */}
            <h2 className="text-heading-md text-slate-dark mb-2 px-1">Riwayat Pestisida</h2>
            {pestisida.length === 0 ? (
              <div className="kbn-card p-5 text-center text-slate-muted mb-5">
                <IonIcon icon={bugOutline} className="text-3xl mb-2" />
                <p className="text-body">Belum ada penyemprotan pestisida.</p>
              </div>
            ) : (
              <div className="kbn-stagger mb-5">
                {pestisida.map((p) =>
                  renderBahanItem(p, splitBahan(p.jenis_pestisida), bugOutline, '#FFE4E6', '#BE123C'),
                )}
              </div>
            )}

            {/* Aktivitas lain */}
            {lainnya.length > 0 && (
              <>
                <h2 className="text-heading-md text-slate-dark mb-2 px-1">Aktivitas Lain</h2>
                <div className="kbn-stagger">
                  {lainnya.map((a) => {
                    const meta = TIPE_META[a.tipe];
                    return (
                      <div key={a.client_uuid} className="kbn-card p-3.5 flex items-center gap-3 mb-3">
                        <div className="kbn-avatar" style={{ background: meta.bg, color: meta.fg }}>
                          <IonIcon icon={meta.icon} className="text-xl" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-heading-md text-slate-dark truncate">{meta.label}</p>
                          <p className="text-caption text-slate-muted mt-0.5">{formatTanggal(a.tanggal)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="px-4 pt-4 space-y-3">
            <div className="kbn-skeleton h-20 w-full !rounded-2xl" />
            <div className="kbn-skeleton h-24 w-full !rounded-2xl" />
          </div>
        )}

        <AplikasiBahanModal
          isOpen={mode !== null}
          title={mode === 'pestisida' ? 'Semprot Pestisida' : 'Beri Pupuk'}
          itemLabel={mode === 'pestisida' ? 'Pestisida' : 'Jenis Pupuk'}
          namaTanaman={lahan ? `${lahan.komoditas} (Bed ${lahan.nomor_bed})` : ''}
          suggestions={mode === 'pestisida' ? [] : pupukOptions}
          submitLabel={mode === 'pestisida' ? 'Simpan Pestisida' : 'Simpan Pemupukan'}
          onClose={() => setMode(null)}
          onSubmit={handleSubmit}
        />

        <IonAlert
          isOpen={toDelete !== null}
          header="Hapus catatan?"
          message="Catatan aktivitas ini akan dihapus."
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
