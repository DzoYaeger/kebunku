import { useState } from 'react';
import {
  IonContent,
  IonPage,
  IonInput,
  IonButton,
  IonText,
  IonIcon,
  useIonRouter,
} from '@ionic/react';
import { leafOutline } from 'ionicons/icons';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { isValidationError } from '../api/client';
import type { ApiValidationError } from '../types';

export default function Register(): React.JSX.Element {
  const register = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);
  const router = useIonRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    try {
      await register(name, email, password, confirm);
      router.push('/app/tanaman', 'root', 'replace');
    } catch (err) {
      if (isValidationError(err) && axios.isAxiosError(err)) {
        const data = err.response?.data as ApiValidationError | undefined;
        const first = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
        setError(first ?? 'Data registrasi tidak valid.');
      } else {
        setError('Gagal mendaftar. Periksa koneksi Anda.');
      }
    }
  };

  return (
    <IonPage>
      <IonContent>
        <div className="min-h-full flex flex-col justify-center px-6 py-10 max-w-md mx-auto relative">
          <div className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-emerald/10 blur-3xl" />
          <div className="pointer-events-none absolute top-40 -left-20 w-56 h-56 rounded-full bg-[#bbf7d0]/40 blur-3xl" />

          <div className="relative">
            <div className="text-center mb-7">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-deep to-emerald text-white mb-3 shadow-lg shadow-emerald/30">
                <IonIcon icon={leafOutline} className="text-3xl" />
              </div>
              <h1 className="text-[1.6rem] font-extrabold text-slate-dark">Buat Akun</h1>
              <p className="text-body text-slate-muted mt-1">Mulai catat kebun Anda</p>
            </div>

            <div className="kbn-card p-5">
              <form onSubmit={submit} className="space-y-4">
                <IonInput
                  label="Nama"
                  labelPlacement="stacked"
                  fill="outline"
                  value={name}
                  onIonInput={(e) => setName(e.detail.value ?? '')}
                  required
                />
                <IonInput
                  label="Email"
                  labelPlacement="stacked"
                  type="email"
                  fill="outline"
                  value={email}
                  onIonInput={(e) => setEmail(e.detail.value ?? '')}
                  required
                />
                <IonInput
                  label="Password"
                  labelPlacement="stacked"
                  type="password"
                  fill="outline"
                  value={password}
                  onIonInput={(e) => setPassword(e.detail.value ?? '')}
                  required
                />
                <IonInput
                  label="Konfirmasi Password"
                  labelPlacement="stacked"
                  type="password"
                  fill="outline"
                  value={confirm}
                  onIonInput={(e) => setConfirm(e.detail.value ?? '')}
                  required
                />

                {error && (
                  <IonText color="danger">
                    <p className="text-caption">{error}</p>
                  </IonText>
                )}

                <IonButton type="submit" expand="block" disabled={loading}>
                  {loading ? 'Memproses…' : 'Daftar'}
                </IonButton>
              </form>
            </div>

            <p className="text-center text-body text-slate-muted mt-6">
              Sudah punya akun?{' '}
              <Link to="/login" className="text-emerald font-semibold">
                Masuk
              </Link>
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
