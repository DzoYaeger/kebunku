import { IonButton, IonIcon, useIonRouter } from '@ionic/react';
import { settingsOutline } from 'ionicons/icons';

// Tombol menuju halaman Pengaturan (Settings) untuk header.
export function AccountButton(): React.JSX.Element {
  const router = useIonRouter();

  return (
    <IonButton onClick={() => router.push('/app/pengaturan', 'forward', 'push')} aria-label="Pengaturan">
      <IonIcon slot="icon-only" icon={settingsOutline} />
    </IonButton>
  );
}
