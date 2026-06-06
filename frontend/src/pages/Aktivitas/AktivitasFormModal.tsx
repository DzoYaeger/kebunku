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
import type { AktivitasInput } from '../../db/repository';
import type { AktivitasTipe } from '../../types';
import { MultiChipInput } from '../../components/MultiChipInput';

interface Props {
  isOpen: boolean;
  lahanOptions: LahanLocal[];
  onClose: () => void;
  onSubmit: (input: AktivitasInput) => Promise<void>;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

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
];

export function AktivitasFormModal({ isOpen, lahanOptions, onClose, onSubmit }: Props): React.JSX.Element {
  const [lahanUuid, setLahanUuid] = useState<string>('');
  const [tipe, setTipe] = useState<AktivitasTipe>('semai');
  const [tanggal, setTanggal] = useState<string>(today());
  const [pupuk, setPupuk] = useState<string[]>([]);
  const [pestisida, setPestisida] = useState<string[]>([]);
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLahanUuid(lahanOptions[0]?.client_uuid ?? '');
      setTipe('semai');
      setTanggal(today());
      setPupuk([]);
      setPestisida([]);
      setCatatan('');
      setError(null);
    }
  }, [isOpen, lahanOptions]);

  const submit = async (): Promise<void> => {
    if (!lahanUuid) {
      setError('Pilih tanaman terlebih dahulu.');
      return;
    }
    if (tipe === 'pemupukan' && pupuk.length === 0) {
      setError('Tambahkan minimal satu jenis pupuk.');
      return;
    }
    if (tipe === 'pestisida' && pestisida.length === 0) {
      setError('Tambahkan minimal satu pestisida.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        lahan_uuid: lahanUuid,
        tipe,
        tanggal,
        jenis_pupuk: tipe === 'pemupukan' ? pupuk.join(', ') : null,
        jenis_pestisida: tipe === 'pestisida' ? pestisida.join(', ') : null,
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
          <IonTitle>Catat Aktivitas</IonTitle>
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

          <IonSelect
            label="Tipe"
            labelPlacement="stacked"
            fill="outline"
            value={tipe}
            onIonChange={(e) => setTipe(e.detail.value as AktivitasTipe)}
          >
            <IonSelectOption value="semai">Semai</IonSelectOption>
            <IonSelectOption value="pindah_tanam">Pindah Tanam</IonSelectOption>
            <IonSelectOption value="pemupukan">Pemupukan</IonSelectOption>
            <IonSelectOption value="pestisida">Pestisida</IonSelectOption>
          </IonSelect>

          <IonInput
            label="Tanggal"
            labelPlacement="stacked"
            type="date"
            fill="outline"
            value={tanggal}
            onIonInput={(e) => setTanggal(e.detail.value ?? today())}
          />

          {tipe === 'pemupukan' && (
            <MultiChipInput
              label="Jenis Pupuk (bisa lebih dari satu)"
              value={pupuk}
              onChange={setPupuk}
              suggestions={PUPUK_SUGGESTIONS}
              placeholder="Ketik jenis pupuk lalu tambah"
            />
          )}

          {tipe === 'pestisida' && (
            <MultiChipInput
              label="Pestisida (bisa lebih dari satu)"
              value={pestisida}
              onChange={setPestisida}
              placeholder="Ketik nama pestisida lalu tambah"
            />
          )}

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

          <IonButton expand="block" onClick={submit} disabled={saving || lahanOptions.length === 0}>
            {saving ? 'Menyimpan…' : 'Simpan'}
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
