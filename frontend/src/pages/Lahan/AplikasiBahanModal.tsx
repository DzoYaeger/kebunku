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
  IonTextarea,
  IonText,
} from '@ionic/react';
import { MultiChipInput } from '../../components/MultiChipInput';

export interface BahanInput {
  bahan: string[];
  tanggal: string;
  catatan: string | null;
}

interface Props {
  isOpen: boolean;
  title: string;
  itemLabel: string;
  namaTanaman: string;
  /** Saran (kosong untuk input manual penuh, mis. pestisida). */
  suggestions: string[];
  submitLabel: string;
  onClose: () => void;
  onSubmit: (input: BahanInput) => Promise<void>;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AplikasiBahanModal({
  isOpen,
  title,
  itemLabel,
  namaTanaman,
  suggestions,
  submitLabel,
  onClose,
  onSubmit,
}: Props): React.JSX.Element {
  const [bahan, setBahan] = useState<string[]>([]);
  const [tanggal, setTanggal] = useState(today());
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBahan([]);
      setTanggal(today());
      setCatatan('');
      setError(null);
    }
  }, [isOpen]);

  const submit = async (): Promise<void> => {
    if (bahan.length === 0) {
      setError(`Tambahkan minimal satu ${itemLabel.toLowerCase()}.`);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ bahan, tanggal, catatan: catatan.trim() || null });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} initialBreakpoint={1} breakpoints={[0, 1]}>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>{title}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Tutup</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="space-y-4">
          <p className="text-caption text-slate-muted">
            Untuk <span className="font-semibold text-slate-dark">{namaTanaman}</span>
          </p>

          <MultiChipInput
            label={`${itemLabel} (bisa lebih dari satu)`}
            value={bahan}
            onChange={setBahan}
            suggestions={suggestions}
            placeholder={`Ketik ${itemLabel.toLowerCase()} lalu tambah`}
          />

          <IonInput
            label="Tanggal"
            labelPlacement="stacked"
            type="date"
            fill="outline"
            value={tanggal}
            onIonInput={(e) => setTanggal(e.detail.value ?? today())}
          />

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
            {saving ? 'Menyimpan…' : submitLabel}
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
}
