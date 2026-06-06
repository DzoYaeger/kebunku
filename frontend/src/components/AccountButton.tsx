import { useState } from 'react';
import { IonButton, IonIcon, IonAlert, useIonRouter } from '@ionic/react';
import { logOutOutline } from 'ionicons/icons';
import { useAuthStore } from '../store/authStore';

// Tombol logout untuk header halaman.
export function AccountButton(): React.JSX.Element {
  const logout = useAuthStore((s) => s.logout);
  const router = useIonRouter();
  const [confirm, setConfirm] = useState(false);

  const doLogout = async (): Promise<void> => {
    await logout();
    router.push('/login', 'root', 'replace');
  };

  return (
    <>
      <IonButton onClick={() => setConfirm(true)} aria-label="Keluar">
        <IonIcon slot="icon-only" icon={logOutOutline} />
      </IonButton>
      <IonAlert
        isOpen={confirm}
        header="Keluar dari akun?"
        message="Data lokal yang belum tersinkron akan dihapus dari perangkat ini."
        buttons={[
          { text: 'Batal', role: 'cancel', handler: () => setConfirm(false) },
          { text: 'Keluar', role: 'destructive', handler: () => void doLogout() },
        ]}
        onDidDismiss={() => setConfirm(false)}
      />
    </>
  );
}
