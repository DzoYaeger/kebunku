import { useState, useCallback } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonSpinner,
  IonText,
  IonItemSliding,
  IonItem,
  IonItemOptions,
  IonItemOption,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  useIonViewWillEnter,
  useIonRouter,
} from '@ionic/react';
import { chatbubblesOutline, addOutline, leafOutline, trashOutline, chatbubbleEllipses } from 'ionicons/icons';
import { listSessions, createSession, deleteSession } from '../../api/chat';
import type { ChatSession } from '../../types';

export default function ChatListPage(): React.JSX.Element {
  const router = useIonRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setSessions(await listSessions());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useIonViewWillEnter(() => {
    void fetchSessions();
  });

  const handleRefresh = async (e: CustomEvent): Promise<void> => {
    await fetchSessions();
    (e.detail as { complete: () => void }).complete();
  };

  const startNew = async (): Promise<void> => {
    setCreating(true);
    try {
      const session = await createSession(null);
      router.push(`/app/chat/${session.id}`, 'forward', 'push');
    } catch { /* silent */ }
    finally { setCreating(false); }
  };

  const remove = async (id: number): Promise<void> => {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const openSession = (id: number): void => {
    router.push(`/app/chat/${id}`, 'forward', 'push');
  };

  const formatDate = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle className="font-semibold text-base">Konsultasi AI</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={(e) => void handleRefresh(e)}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="px-4 pt-3 pb-24">
          {/* Tombol Chat Baru */}
          <button
            type="button"
            onClick={() => void startNew()}
            disabled={creating}
            className="w-full flex items-center gap-3 p-4 mb-4 rounded-xl bg-gradient-to-br from-emerald-deep to-emerald text-white shadow-md shadow-emerald/30"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              {creating ? <IonSpinner name="dots" /> : <IonIcon icon={addOutline} className="text-2xl" />}
            </div>
            <div className="text-left">
              <p className="text-sm font-bold">Konsultasi Baru</p>
              <p className="text-[11px] text-white/80">Tanya apa saja tentang tanamanmu</p>
            </div>
          </button>

          {loading ? (
            <div className="flex justify-center py-10">
              <IonSpinner name="crescent" color="primary" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <IonIcon icon={chatbubblesOutline} className="text-5xl text-slate-300 mb-2" />
              <IonText color="medium">
                <p className="text-sm">Belum ada konsultasi.</p>
                <p className="text-xs mt-1">Mulai konsultasi baru dengan Asisten Kebunku.</p>
              </IonText>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-1 mb-2">Riwayat</p>
              {sessions.map((s) => (
                <IonItemSliding key={s.id}>
                  <IonItem button detail={false} lines="none" className="mb-2 rounded-xl overflow-hidden" onClick={() => openSession(s.id)}>
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center mr-3">
                      <IonIcon icon={chatbubbleEllipses} className="text-emerald-600" />
                    </div>
                    <IonLabel>
                      <p className="text-sm font-semibold text-slate-800 truncate">{s.judul}</p>
                      <div className="flex items-center gap-2">
                        {s.lahan && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5 flex items-center gap-0.5">
                            <IonIcon icon={leafOutline} className="text-[10px]" /> {s.lahan.komoditas}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">{formatDate(s.updated_at)}</span>
                      </div>
                    </IonLabel>
                  </IonItem>
                  <IonItemOptions side="end">
                    <IonItemOption color="danger" onClick={() => void remove(s.id)}>
                      <IonIcon slot="icon-only" icon={trashOutline} />
                    </IonItemOption>
                  </IonItemOptions>
                </IonItemSliding>
              ))}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
