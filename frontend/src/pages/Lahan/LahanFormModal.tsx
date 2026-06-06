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
} from '@ionic/react';
import type { LahanLocal } from '../../db';
import type { LahanInput } from '../../db/repository';
import type { LahanStatus } from '../../types';
import { CommodityAvatar } from '../../components/CommodityAvatar';

interface Props {
  isOpen: boolean;
  editing: LahanLocal | null;
  /** Jenis tanaman yang sudah ada (saran cepat). */
  komoditasOptions: string[];
  onClose: () => void;
  onSubmit: (input: LahanInput, editing: LahanLocal | null) => Promise<void>;
}

export function LahanFormModal({
  isOpen,
  editing,
  komoditasOptions,
  onClose,
  onSubmit,
}: Props): React.JSX.Element {
  const [nomorBed, setNomorBed] = useState('');
  const [komoditas, setKomoditas] = useState('');
  const [status, setStatus] = useState<LahanStatus>('semai');
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNomorBed(editing?.nomor_bed ?? '');
      setKomoditas(editing?.komoditas ?? '');
      setStatus(editing?.status ?? 'semai');
      setCatatan(editing?.catatan ?? '');
    }
  }, [isOpen, editing]);

  const submit = async (): Promise<void> => {
    if (!nomorBed.trim() || !komoditas.trim()) return;
    setSaving(true);
    try {
      await onSubmit(
        { nomor_bed: nomorBed.trim(), komoditas: komoditas.trim(), status, catatan: catatan.trim() || null },
        editing,
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const activeKey = komoditas.trim().toLowerCase();

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} initialBreakpoint={1} breakpoints={[0, 1]}>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>{editing ? 'Edit Tanaman' : 'Tanaman Baru'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Tutup</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="space-y-4">
          <IonInput
            label="Jenis Tanaman"
            labelPlacement="stacked"
            fill="outline"
            value={komoditas}
            onIonInput={(e) => setKomoditas(e.detail.value ?? '')}
            placeholder="mis. Cabai, Tomat, Selada"
          />

          {/* Saran jenis tanaman yang sudah ada di data */}
          {komoditasOptions.length > 0 && (
            <div>
              <p className="text-caption text-slate-muted mb-2">Sudah ada di kebun Anda</p>
              <div className="flex flex-wrap gap-2">
                {komoditasOptions.map((k) => {
                  const selected = k.toLowerCase() === activeKey;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKomoditas(k)}
                      className={`flex items-center gap-1.5 rounded-full border pl-1.5 pr-3 py-1 text-caption font-medium transition-colors ${
                        selected
                          ? 'border-emerald bg-emerald/10 text-emerald-deep'
                          : 'border-slate-200 bg-white text-slate-dark'
                      }`}
                    >
                      <CommodityAvatar komoditas={k} className="!w-6 !h-6 !text-sm !rounded-full" />
                      {k}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <IonInput
            label="Nomor Bed"
            labelPlacement="stacked"
            fill="outline"
            value={nomorBed}
            onIonInput={(e) => setNomorBed(e.detail.value ?? '')}
            placeholder="mis. BED-01"
          />

          <IonSelect
            label="Status"
            labelPlacement="stacked"
            fill="outline"
            value={status}
            onIonChange={(e) => setStatus(e.detail.value as LahanStatus)}
          >
            <IonSelectOption value="semai">Semai</IonSelectOption>
            <IonSelectOption value="aktif">Aktif</IonSelectOption>
            <IonSelectOption value="selesai">Selesai</IonSelectOption>
          </IonSelect>

          <IonTextarea
            label="Catatan"
            labelPlacement="stacked"
            fill="outline"
            value={catatan}
            onIonInput={(e) => setCatatan(e.detail.value ?? '')}
            autoGrow
          />

          <IonButton expand="block" onClick={submit} disabled={saving}>
            {saving ? 'Menyimpan…' : 'Simpan'}
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
}
