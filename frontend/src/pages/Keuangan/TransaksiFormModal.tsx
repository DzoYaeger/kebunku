import { useEffect, useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonTextarea,
  IonText,
  IonIcon,
} from '@ionic/react';
import { trendingUpOutline, trendingDownOutline } from 'ionicons/icons';
import type { LahanLocal, TransaksiLocal } from '../../db';
import type { TransaksiInput } from '../../db/repository';
import type { TransaksiTipe } from '../../types';

interface Props {
  isOpen: boolean;
  defaultTipe: TransaksiTipe;
  lahanOptions: LahanLocal[];
  komoditasList: string[];
  editing?: TransaksiLocal | null;
  onClose: () => void;
  onSubmit: (input: TransaksiInput) => Promise<void>;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const KATEGORI_KELUAR = ['benih', 'pupuk', 'pestisida', 'upah', 'alat', 'lainnya'];
const KATEGORI_MASUK = ['penjualan', 'lainnya'];

export function TransaksiFormModal({ isOpen, defaultTipe, lahanOptions, komoditasList, editing, onClose, onSubmit }: Props): React.JSX.Element {
  const [tipe, setTipe] = useState<TransaksiTipe>(defaultTipe);
  const [kategori, setKategori] = useState<string>('penjualan');
  const [komoditas, setKomoditas] = useState<string>('');
  const [nominal, setNominal] = useState<string>('');
  const [tanggal, setTanggal] = useState<string>(today());
  const [lahanUuid, setLahanUuid] = useState<string>('');
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editing) {
        setTipe(editing.tipe);
        setKategori(editing.kategori);
        setKomoditas(editing.komoditas ?? '');
        setNominal(editing.nominal);
        setTanggal(editing.tanggal);
        setLahanUuid(editing.lahan_uuid ?? '');
        setCatatan(editing.catatan ?? '');
      } else {
        setTipe(defaultTipe);
        setKategori(defaultTipe === 'kas_masuk' ? 'penjualan' : 'benih');
        setKomoditas('');
        setNominal('');
        setTanggal(today());
        setLahanUuid('');
        setCatatan('');
      }
      setError(null);
    }
  }, [isOpen, defaultTipe, editing]);

  useEffect(() => {
    setKategori(tipe === 'kas_masuk' ? 'penjualan' : 'benih');
  }, [tipe]);

  const submit = async (): Promise<void> => {
    const num = Number(nominal);
    if (!Number.isFinite(num) || num <= 0) {
      setError('Nominal harus lebih dari 0.');
      return;
    }
    if (tipe === 'kas_masuk' && !komoditas.trim()) {
      setError('Pilih komoditas/tanaman yang dijual.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        tipe,
        kategori,
        komoditas: tipe === 'kas_masuk' ? komoditas.trim() : null,
        nominal: String(num),
        tanggal,
        lahan_uuid: lahanUuid || null,
        catatan: catatan.trim() || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const kategoriOptions = tipe === 'kas_masuk' ? KATEGORI_MASUK : KATEGORI_KELUAR;
  const isMasuk = tipe === 'kas_masuk';

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} initialBreakpoint={1} breakpoints={[0, 1]}>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle className="text-[0.95rem] font-bold">
            {editing ? 'Edit Transaksi' : isMasuk ? 'Catat Pemasukan' : 'Catat Pengeluaran'}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose} className="text-slate-muted">Tutup</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="space-y-4">
          {/* Segment toggle */}
          <div className="rounded-2xl bg-[#f1f5f9] p-1">
            <IonSegment
              className="kbn-segment"
              value={tipe}
              onIonChange={(e) => setTipe(e.detail.value as TransaksiTipe)}
            >
              <IonSegmentButton value="kas_masuk">
                <div className="flex items-center gap-1.5">
                  <IonIcon icon={trendingUpOutline} className="text-sm" />
                  <IonLabel>Pemasukan</IonLabel>
                </div>
              </IonSegmentButton>
              <IonSegmentButton value="kas_keluar">
                <div className="flex items-center gap-1.5">
                  <IonIcon icon={trendingDownOutline} className="text-sm" />
                  <IonLabel>Pengeluaran</IonLabel>
                </div>
              </IonSegmentButton>
            </IonSegment>
          </div>

          {/* Nominal — paling penting, tampilkan prominent */}
          <div className="kbn-card p-4">
            <IonInput
              label="Nominal (Rp)"
              labelPlacement="stacked"
              type="number"
              inputmode="numeric"
              fill="outline"
              value={nominal}
              onIonInput={(e) => setNominal(e.detail.value ?? '')}
              placeholder="0"
              className="text-lg font-bold"
            />
          </div>

          {isMasuk && (
            <IonSelect
              label="Komoditas / Tanaman yang Dijual"
              labelPlacement="stacked"
              fill="outline"
              value={komoditas}
              onIonChange={(e) => setKomoditas(e.detail.value as string)}
              placeholder="Pilih tanaman"
            >
              {komoditasList.map((k) => (
                <IonSelectOption key={k} value={k}>
                  {k}
                </IonSelectOption>
              ))}
            </IonSelect>
          )}

          <IonSelect
            label="Kategori"
            labelPlacement="stacked"
            fill="outline"
            value={kategori}
            onIonChange={(e) => setKategori(e.detail.value as string)}
          >
            {kategoriOptions.map((k) => (
              <IonSelectOption key={k} value={k} className="capitalize">
                {k}
              </IonSelectOption>
            ))}
          </IonSelect>

          <IonInput
            label="Tanggal"
            labelPlacement="stacked"
            type="date"
            fill="outline"
            value={tanggal}
            onIonInput={(e) => setTanggal(e.detail.value ?? today())}
          />

          {!isMasuk && (
            <IonSelect
              label="Lahan (opsional)"
              labelPlacement="stacked"
              fill="outline"
              value={lahanUuid}
              onIonChange={(e) => setLahanUuid(e.detail.value as string)}
              placeholder="Tanpa lahan"
            >
              <IonSelectOption value="">Tanpa lahan</IonSelectOption>
              {lahanOptions.map((l) => (
                <IonSelectOption key={l.client_uuid} value={l.client_uuid}>
                  Bed {l.nomor_bed} · {l.komoditas}
                </IonSelectOption>
              ))}
            </IonSelect>
          )}

          <IonTextarea
            label="Catatan (opsional)"
            labelPlacement="stacked"
            fill="outline"
            value={catatan}
            onIonInput={(e) => setCatatan(e.detail.value ?? '')}
            autoGrow
            rows={2}
          />

          {error && (
            <IonText color="danger">
              <p className="text-[0.75rem] font-medium">{error}</p>
            </IonText>
          )}

          <IonButton
            expand="block"
            onClick={submit}
            disabled={saving}
            className="mt-2"
            style={{
              '--background': isMasuk ? '#15803D' : '#e11d48',
              '--border-radius': '14px',
              '--box-shadow': isMasuk
                ? '0 8px 20px -6px rgba(21, 128, 61, 0.4)'
                : '0 8px 20px -6px rgba(225, 29, 72, 0.4)',
            } as React.CSSProperties}
          >
            {saving ? 'Menyimpan…' : editing ? '✏️ Simpan Perubahan' : isMasuk ? '💰 Simpan Pemasukan' : '💸 Simpan Pengeluaran'}
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
}
