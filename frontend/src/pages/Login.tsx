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
import { useAuthStore } from '../store/authStore';
import { isValidationError } from '../api/client';

export default function Login(): React.JSX.Element {
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const router = useIonRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      router.push('/app/tanaman', 'root', 'replace');
    } catch (err) {
      if (isValidationError(err)) {
        setError('Email atau password salah.');
      } else {
        setError('Gagal masuk. Periksa koneksi Anda.');
      }
    }
  };

  return (
    <IonPage>
      <IonContent>
        <div className="min-h-full flex flex-col justify-center px-6 py-10 max-w-md mx-auto relative">
          {/* gradient lembut latar */}
          <div className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-emerald/10 blur-3xl" />
          <div className="pointer-events-none absolute top-32 -left-20 w-56 h-56 rounded-full bg-[#bbf7d0]/40 blur-3xl" />

          <div className="relative">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-deep to-emerald text-white mb-3 shadow-lg shadow-emerald/30">
                <IonIcon icon={leafOutline} className="text-3xl" />
              </div>
              <h1 className="text-[1.6rem] font-extrabold text-slate-dark">Kebunku</h1>
              <p className="text-body text-slate-muted mt-1">Manajemen kebun & arus kas</p>
            </div>

            <div className="kbn-card p-5">
              <form onSubmit={submit} className="space-y-4">
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

                {error && (
                  <IonText color="danger">
                    <p className="text-caption">{error}</p>
                  </IonText>
                )}

                <IonButton type="submit" expand="block" disabled={loading}>
                  {loading ? 'Memproses…' : 'Masuk'}
                </IonButton>
              </form>
            </div>

            <p className="text-center text-body text-slate-muted mt-6">
              Belum punya akun?{' '}
              <Link to="/register" className="text-emerald font-semibold">
                Daftar
              </Link>
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
