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
import type { PanenInput } from '../../db/repository';

interface Props {
  isOpen: boolean;
  lahanOptions: LahanLocal[];
  onClose: () => void;
  onSubmit: (input: PanenInput) => Promise<void>;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PanenFormModal({ isOpen, lahanOptions, onClose, onSubmit }: Props): React.JSX.Element {
  const [lahanUuid, setLahanUuid] = useState<string>('');
  const [tanggal, setTanggal] = useState<string>(today());
  const [berat, setBerat] = useState('');
  const [grade, setGrade] = useState('');
  const [hargaJual, setHargaJual] = useState('');
  const [pembeli, setPembeli] = useState('');
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLahanUuid(lahanOptions[0]?.client_uuid ?? '');
      setTanggal(today());
      setBerat('');
      setGrade('');
      setHargaJual('');
      setPembeli('');
      setCatatan('');
      setError(null);
    }
  }, [isOpen, lahanOptions]);

  const submit = async (): Promise<void> => {
    if (!lahanUuid) { setError('Pilih tanaman terlebih dahulu.'); return; }
    if (!berat || Number(berat) <= 0) { setError('Berat harus lebih dari 0.'); return; }
    setSaving(true);
    try {
      await onSubmit({
        lahan_uuid: lahanUuid,
        tanggal,
        berat,
        grade: grade.trim() || null,
        harga_jual: hargaJual.trim() || null,
        pembeli: pembeli.trim() || null,
        catatan: catatan.trim() || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} initialBreakpoint={1} breakpoints={[0, 1]}>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>Catat Panen</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Tutup</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="space-y-4">
          <IonSelect
            label="Tanaman"
            labelPlacement="stacked"
            fill="outline"
            value={lahanUuid}
            onIonChange={(e) => setLahanUuid(e.detail.value as string)}
            placeholder="Pilih tanaman"
          >
            {lahanOptions.map((l) => (
              <IonSelectOption key={l.client_uuid} value={l.client_uuid}>
                Bed {l.nomor_bed} · {l.komoditas}
              </IonSelectOption>
            ))}
          </IonSelect>

          <IonInput label="Tanggal" labelPlacement="stacked" type="date" fill="outline" value={tanggal}
            onIonInput={(e) => setTanggal(e.detail.value ?? today())} />

          <IonInput label="Berat (Kg)" labelPlacement="stacked" type="number" fill="outline" value={berat}
            onIonInput={(e) => setBerat(e.detail.value ?? '')} placeholder="0.00" />

          <IonInput label="Grade / Kualitas (opsional)" labelPlacement="stacked" fill="outline" value={grade}
            onIonInput={(e) => setGrade(e.detail.value ?? '')} placeholder="A, B, C..." />

          <IonInput label="Harga Jual per Kg (opsional)" labelPlacement="stacked" type="number" fill="outline" value={hargaJual}
            onIonInput={(e) => setHargaJual(e.detail.value ?? '')} placeholder="Rp" />

          <IonInput label="Pembeli (opsional)" labelPlacement="stacked" fill="outline" value={pembeli}
            onIonInput={(e) => setPembeli(e.detail.value ?? '')} />

          <IonTextarea label="Catatan" labelPlacement="stacked" fill="outline" value={catatan}
            onIonInput={(e) => setCatatan(e.detail.value ?? '')} autoGrow />

          {error && (
            <IonText color="danger"><p className="text-caption">{error}</p></IonText>
          )}

          <IonButton expand="block" onClick={submit} disabled={saving || lahanOptions.length === 0}>
            {saving ? 'Menyimpan…' : 'Simpan Panen'}
          </IonButton>
          {lahanOptions.length === 0 && (
            <IonText color="medium">
              <p className="text-caption text-center">Tambahkan tanaman dulu di tab Tanaman.</p>
            </IonText>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
}
