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
  IonTextarea,
  IonText,
} from '@ionic/react';
import type { LahanLocal } from '../../db';
import type { TransaksiInput } from '../../db/repository';

interface Props {
  isOpen: boolean;
  lahanOptions: LahanLocal[];
  onClose: () => void;
  onSubmit: (input: TransaksiInput) => Promise<void>;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const KATEGORI = ['benih', 'pupuk', 'pestisida', 'upah', 'alat', 'lainnya'];

export function TransaksiFormModal({ isOpen, lahanOptions, onClose, onSubmit }: Props): React.JSX.Element {
  const [kategori, setKategori] = useState<string>('benih');
  const [nominal, setNominal] = useState<string>('');
  const [tanggal, setTanggal] = useState<string>(today());
  const [lahanUuid, setLahanUuid] = useState<string>('');
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setKategori('benih');
      setNominal('');
      setTanggal(today());
      setLahanUuid('');
      setCatatan('');
      setError(null);
    }
  }, [isOpen]);

  const submit = async (): Promise<void> => {
    const num = Number(nominal);
    if (!Number.isFinite(num) || num <= 0) {
      setError('Nominal harus lebih dari 0.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        kategori,
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

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} initialBreakpoint={1} breakpoints={[0, 1]}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Kas Keluar</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Tutup</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="space-y-4">
          <IonSelect
            label="Kategori"
            labelPlacement="stacked"
            fill="outline"
            value={kategori}
            onIonChange={(e) => setKategori(e.detail.value as string)}
          >
            {KATEGORI.map((k) => (
              <IonSelectOption key={k} value={k} className="capitalize">
                {k}
              </IonSelectOption>
            ))}
          </IonSelect>

          <IonInput
            label="Nominal (Rp)"
            labelPlacement="stacked"
            type="number"
            inputmode="numeric"
            fill="outline"
            value={nominal}
            onIonInput={(e) => setNominal(e.detail.value ?? '')}
            placeholder="0"
          />

          <IonInput
            label="Tanggal"
            labelPlacement="stacked"
            type="date"
            fill="outline"
            value={tanggal}
            onIonInput={(e) => setTanggal(e.detail.value ?? today())}
          />

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

          <IonTextarea
            label="Catatan"
            labelPlacement="stacked"
            fill="outline"
            value={catatan}
            onIonInput={(e) => setCatatan(e.detail.value ?? '')}
            autoGrow
          />

          {error && (
            <IonText color="danger">
              <p className="text-caption">{error}</p>
            </IonText>
          )}

          <IonButton expand="block" onClick={submit} disabled={saving}>
            {saving ? 'Menyimpan…' : 'Simpan'}
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
}
