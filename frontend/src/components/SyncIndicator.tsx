import { useState } from 'react';
import { IonChip, IonIcon, IonLabel } from '@ionic/react';
import { cloudOfflineOutline, syncOutline, checkmarkCircleOutline, warningOutline } from 'ionicons/icons';
import { useSyncStore } from '../store/syncStore';
import { SyncStatusModal } from './SyncStatusModal';

// Indikator status sinkronisasi (Req 5.8): online/offline, jumlah pending, gagal.
// Dapat diketuk untuk membuka detail antrean & "Coba lagi".
export function SyncIndicator(): React.JSX.Element {
  const { isOnline, pendingCount, failedCount, isSyncing } = useSyncStore();
  const [open, setOpen] = useState(false);

  const chip = ((): React.JSX.Element => {
    if (!isOnline) {
      return (
        <IonChip color="medium" className="!h-7" onClick={() => setOpen(true)}>
          <IonIcon icon={cloudOfflineOutline} />
          <IonLabel className="text-caption">Offline</IonLabel>
        </IonChip>
      );
    }

    if (failedCount > 0) {
      return (
        <IonChip color="danger" className="!h-7" onClick={() => setOpen(true)}>
          <IonIcon icon={warningOutline} />
          <IonLabel className="text-caption">{failedCount} gagal</IonLabel>
        </IonChip>
      );
    }

    if (pendingCount > 0 || isSyncing) {
      return (
        <IonChip color="warning" className="!h-7" onClick={() => setOpen(true)}>
          <IonIcon icon={syncOutline} className={isSyncing ? 'animate-spin' : ''} />
          <IonLabel className="text-caption">{pendingCount} antre</IonLabel>
        </IonChip>
      );
    }

    return (
      <IonChip color="success" className="!h-7" onClick={() => setOpen(true)}>
        <IonIcon icon={checkmarkCircleOutline} />
        <IonLabel className="text-caption">Tersinkron</IonLabel>
      </IonChip>
    );
  })();

  return (
    <>
      {chip}
      <SyncStatusModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
