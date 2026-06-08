import { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonModal,
  IonButtons,
  IonButton,
  IonInput,
  IonText,
  IonSpinner,
  IonToast,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  personCircleOutline,
  lockClosedOutline,
  locationOutline,
  chevronForward,
  navigateOutline,
  searchOutline,
  closeOutline,
  logOutOutline,
} from 'ionicons/icons';
import { useAuthStore } from '../../store/authStore';
import { useLocationStore, requestGpsLocation, geocodeCity } from '../../store/locationStore';
import { isValidationError } from '../../api/client';
import { useIonRouter, IonAlert } from '@ionic/react';

type ModalType = 'profil' | 'password' | 'lokasi' | null;

export default function SettingsPage(): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  const loadMe = useAuthStore((s) => s.loadMe);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const logout = useAuthStore((s) => s.logout);
  const router = useIonRouter();
  const location = useLocationStore((s) => s.location);
  const setLocation = useLocationStore((s) => s.setLocation);

  const [modal, setModal] = useState<ModalType>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const doLogout = async (): Promise<void> => {
    await logout();
    router.push('/login', 'root', 'replace');
  };

  // Profil form
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  // Password form
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdErr, setPwdErr] = useState<string | null>(null);

  // Lokasi form
  const [cityInput, setCityInput] = useState('');
  const [locLoading, setLocLoading] = useState(false);
  const [locErr, setLocErr] = useState<string | null>(null);

  useIonViewWillEnter(() => {
    void loadMe();
  });

  const openProfil = (): void => {
    setName(user?.name ?? '');
    setUsername(user?.username ?? '');
    setEmail(user?.email ?? '');
    setProfileErr(null);
    setModal('profil');
  };

  const saveProfil = async (): Promise<void> => {
    setSavingProfile(true);
    setProfileErr(null);
    try {
      await updateProfile(name, username, email);
      setModal(null);
      setToast('Profil berhasil diperbarui.');
    } catch (err) {
      setProfileErr(isValidationError(err) ? 'Data tidak valid (username/email mungkin sudah dipakai).' : 'Gagal menyimpan profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePwd = async (): Promise<void> => {
    setSavingPwd(true);
    setPwdErr(null);
    try {
      await updatePassword(curPwd, newPwd, confPwd);
      setModal(null);
      setCurPwd(''); setNewPwd(''); setConfPwd('');
      setToast('Password berhasil diubah.');
    } catch (err) {
      setPwdErr(isValidationError(err) ? 'Password saat ini salah atau password baru tidak valid (min. 8 karakter).' : 'Gagal mengubah password.');
    } finally {
      setSavingPwd(false);
    }
  };

  const useGps = async (): Promise<void> => {
    setLocLoading(true);
    setLocErr(null);
    try {
      const loc = await requestGpsLocation();
      setLocation(loc);
      setModal(null);
      setToast('Lokasi GPS tersimpan.');
    } catch (err) {
      setLocErr((err as Error).message);
    } finally {
      setLocLoading(false);
    }
  };

  const searchCity = async (): Promise<void> => {
    if (!cityInput.trim()) return;
    setLocLoading(true);
    setLocErr(null);
    try {
      const loc = await geocodeCity(cityInput.trim());
      setLocation(loc);
      setModal(null);
      setCityInput('');
      setToast(`Lokasi diatur ke ${loc.label}.`);
    } catch (err) {
      setLocErr((err as Error).message);
    } finally {
      setLocLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle className="font-semibold text-base">Pengaturan</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="px-4 pt-4">
          {/* Profil ringkas */}
          <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm mb-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <IonIcon icon={personCircleOutline} className="text-emerald-600 text-3xl" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name ?? '-'}</p>
              <p className="text-xs text-slate-500 truncate">
                {user?.username ? `@${user.username}` : user?.email}
              </p>
            </div>
          </div>

          {/* Menu Akun */}
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-1 mb-1">Akun</p>
          <IonList inset className="rounded-xl mb-4">
            <IonItem button detail={false} onClick={openProfil}>
              <IonIcon icon={personCircleOutline} slot="start" className="text-emerald-600" />
              <IonLabel className="text-sm">Edit Profil</IonLabel>
              <IonIcon icon={chevronForward} slot="end" className="text-slate-300" />
            </IonItem>
            <IonItem button detail={false} onClick={() => { setPwdErr(null); setModal('password'); }}>
              <IonIcon icon={lockClosedOutline} slot="start" className="text-emerald-600" />
              <IonLabel className="text-sm">Ubah Password</IonLabel>
              <IonIcon icon={chevronForward} slot="end" className="text-slate-300" />
            </IonItem>
          </IonList>

          {/* Menu Lokasi */}
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-1 mb-1">Lokasi & Cuaca</p>
          <IonList inset className="rounded-xl">
            <IonItem button detail={false} onClick={() => { setLocErr(null); setModal('lokasi'); }}>
              <IonIcon icon={locationOutline} slot="start" className="text-emerald-600" />
              <IonLabel className="text-sm">
                Lokasi Cuaca
                <p className="text-[11px] text-slate-400">{location.label}</p>
              </IonLabel>
              <IonIcon icon={chevronForward} slot="end" className="text-slate-300" />
            </IonItem>
          </IonList>

          {/* Logout */}
          <IonList inset className="rounded-xl mt-4">
            <IonItem button detail={false} onClick={() => setConfirmLogout(true)}>
              <IonIcon icon={logOutOutline} slot="start" color="danger" />
              <IonLabel className="text-sm" color="danger">Keluar</IonLabel>
            </IonItem>
          </IonList>
        </div>

        {/* ─── Modal Edit Profil ─── */}
        <IonModal isOpen={modal === 'profil'} onDidDismiss={() => setModal(null)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Edit Profil</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setModal(null)}><IonIcon icon={closeOutline} /></IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <div className="space-y-4">
              <IonInput label="Nama" labelPlacement="stacked" fill="outline" value={name} onIonInput={(e) => setName(e.detail.value ?? '')} />
              <IonInput label="Username" labelPlacement="stacked" fill="outline" autocapitalize="off" value={username} onIonInput={(e) => setUsername(e.detail.value ?? '')} />
              <IonInput label="Email" labelPlacement="stacked" type="email" fill="outline" autocapitalize="off" value={email} onIonInput={(e) => setEmail(e.detail.value ?? '')} />
              {profileErr && <IonText color="danger"><p className="text-caption">{profileErr}</p></IonText>}
              <IonButton expand="block" disabled={savingProfile} onClick={() => void saveProfil()}>
                {savingProfile ? <IonSpinner name="dots" /> : 'Simpan'}
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        {/* ─── Modal Ubah Password ─── */}
        <IonModal isOpen={modal === 'password'} onDidDismiss={() => setModal(null)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Ubah Password</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setModal(null)}><IonIcon icon={closeOutline} /></IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <div className="space-y-4">
              <IonInput label="Password Saat Ini" labelPlacement="stacked" type="password" fill="outline" value={curPwd} onIonInput={(e) => setCurPwd(e.detail.value ?? '')} />
              <IonInput label="Password Baru" labelPlacement="stacked" type="password" fill="outline" value={newPwd} onIonInput={(e) => setNewPwd(e.detail.value ?? '')} />
              <IonInput label="Konfirmasi Password Baru" labelPlacement="stacked" type="password" fill="outline" value={confPwd} onIonInput={(e) => setConfPwd(e.detail.value ?? '')} />
              {pwdErr && <IonText color="danger"><p className="text-caption">{pwdErr}</p></IonText>}
              <IonButton expand="block" disabled={savingPwd} onClick={() => void savePwd()}>
                {savingPwd ? <IonSpinner name="dots" /> : 'Ubah Password'}
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        {/* ─── Modal Lokasi ─── */}
        <IonModal isOpen={modal === 'lokasi'} onDidDismiss={() => setModal(null)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Lokasi Cuaca</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setModal(null)}><IonIcon icon={closeOutline} /></IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="text-xs text-slate-600">Lokasi saat ini:</p>
                <p className="text-sm font-semibold text-emerald-800">{location.label}</p>
              </div>

              <IonButton expand="block" fill="solid" disabled={locLoading} onClick={() => void useGps()}>
                <IonIcon icon={navigateOutline} slot="start" />
                Gunakan Lokasi GPS
              </IonButton>

              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[11px] text-slate-400">atau masukkan kota</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <IonInput
                label="Nama Kota"
                labelPlacement="stacked"
                fill="outline"
                placeholder="mis. Palopo, Makassar"
                value={cityInput}
                onIonInput={(e) => setCityInput(e.detail.value ?? '')}
              />
              <IonButton expand="block" fill="outline" disabled={locLoading || !cityInput.trim()} onClick={() => void searchCity()}>
                {locLoading ? <IonSpinner name="dots" /> : (<><IonIcon icon={searchOutline} slot="start" />Cari & Simpan</>)}
              </IonButton>

              {locErr && <IonText color="danger"><p className="text-caption">{locErr}</p></IonText>}
            </div>
          </IonContent>
        </IonModal>

        <IonToast isOpen={toast !== null} message={toast ?? ''} duration={2000} color="success" onDidDismiss={() => setToast(null)} />

        <IonAlert
          isOpen={confirmLogout}
          header="Keluar dari akun?"
          message="Data lokal yang belum tersinkron akan dihapus dari perangkat ini."
          buttons={[
            { text: 'Batal', role: 'cancel', handler: () => setConfirmLogout(false) },
            { text: 'Keluar', role: 'destructive', handler: () => void doLogout() },
          ]}
          onDidDismiss={() => setConfirmLogout(false)}
        />
      </IonContent>
    </IonPage>
  );
}
