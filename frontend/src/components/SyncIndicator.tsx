import { IonChip, IonIcon, IonLabel } from '@ionic/react';
import { cloudOfflineOutline, syncOutline, checkmarkCircleOutline, warningOutline } from 'ionicons/icons';
import { useSyncStore } from '../store/syncStore';

// Indikator status sinkronisasi (Req 5.8): online/offline, jumlah pending, gagal.
export function SyncIndicator(): React.JSX.Element {
  const { isOnline, pendingCount, failedCount, isSyncing } = useSyncStore();

  if (!isOnline) {
    return (
      <IonChip color="medium" className="!h-7">
        <IonIcon icon={cloudOfflineOutline} />
        <IonLabel className="text-caption">Offline</IonLabel>
      </IonChip>
    );
  }

  if (failedCount > 0) {
    return (
      <IonChip color="danger" className="!h-7">
        <IonIcon icon={warningOutline} />
        <IonLabel className="text-caption">{failedCount} gagal</IonLabel>
      </IonChip>
    );
  }

  if (pendingCount > 0 || isSyncing) {
    return (
      <IonChip color="warning" className="!h-7">
        <IonIcon icon={syncOutline} className={isSyncing ? 'animate-spin' : ''} />
        <IonLabel className="text-caption">{pendingCount} antre</IonLabel>
      </IonChip>
    );
  }

  return (
    <IonChip color="success" className="!h-7">
      <IonIcon icon={checkmarkCircleOutline} />
      <IonLabel className="text-caption">Tersinkron</IonLabel>
    </IonChip>
  );
}
