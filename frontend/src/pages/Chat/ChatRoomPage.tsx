import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonFooter,
  IonIcon,
  IonSpinner,
  IonTextarea,
  IonButton,
  IonModal,
  IonList,
  IonItem,
  IonLabel,
  IonRadio,
  IonRadioGroup,
} from '@ionic/react';
import { send, imageOutline, cameraOutline, leafOutline, closeCircle, sparkles, addCircleOutline } from 'ionicons/icons';
import { getSession, sendMessage } from '../../api/chat';
import { lahanRepo } from '../../db/repository';
import type { LahanLocal } from '../../db';
import type { ChatMessage, ChatSession } from '../../types';

export default function ChatRoomPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);

  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Lahan selector
  const [lahanList, setLahanList] = useState<LahanLocal[]>([]);
  const [showLahanModal, setShowLahanModal] = useState(false);
  const [selectedLahan, setSelectedLahan] = useState<LahanLocal | null>(null);

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLIonContentElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => void contentRef.current?.scrollToBottom(300), 100);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [s, lahan] = await Promise.all([getSession(sessionId), lahanRepo.list()]);
      setSession(s);
      setMessages(s.messages ?? []);
      setLahanList(lahan.filter((l) => l.server_id !== null));
      if (s.lahan) {
        const match = lahan.find((l) => l.server_id === s.lahan?.id);
        if (match) setSelectedLahan(match);
      }
      scrollToBottom();
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [sessionId, scrollToBottom]);

  useEffect(() => {
    void load();
  }, [load]);

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
    e.target.value = '';
  };

  const clearImage = (): void => {
    setImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const handleSend = async (): Promise<void> => {
    const text = input.trim();
    if (!text && !image) return;
    setSending(true);

    // Optimistic user bubble
    const tempId = Date.now();
    const optimistic: ChatMessage = {
      id: tempId,
      chat_session_id: sessionId,
      role: 'user',
      content: text || '[Mengirim gambar]',
      image_url: imagePreview,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    const sentImage = image;
    clearImage();
    scrollToBottom();

    try {
      const res = await sendMessage(sessionId, text, sentImage, selectedLahan?.server_id ?? null);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        res.user_message,
        res.assistant_message,
      ]);
      scrollToBottom();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          chat_session_id: sessionId,
          role: 'assistant',
          content: 'Gagal mengirim pesan. Periksa koneksi dan coba lagi.',
          image_url: null,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/app/chat" text="" />
          </IonButtons>
          <IonTitle className="text-sm font-semibold">{session?.judul ?? 'Konsultasi'}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent ref={contentRef} className="chat-bg">
        <div className="px-3 py-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <IonSpinner name="crescent" color="primary" />
            </div>
          ) : (
            <>
              {/* Lahan context selector */}
              <div className="flex justify-center mb-4">
                <button
                  type="button"
                  onClick={() => setShowLahanModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700"
                >
                  <IonIcon icon={leafOutline} className="text-sm" />
                  {selectedLahan ? `${selectedLahan.komoditas} (Bed ${selectedLahan.nomor_bed})` : 'Pilih tanaman (opsional)'}
                </button>
              </div>

              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-3">
                    <IonIcon icon={sparkles} className="text-emerald-600 text-3xl" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Asisten Kebunku</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-[260px]">
                    Tanyakan apa saja seputar perawatan, hama, pupuk, atau kirim foto tanamanmu untuk dianalisis.
                  </p>
                </div>
              )}

              {messages.map((m) => (
                <div key={m.id} className={`flex mb-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                      m.role === 'user'
                        ? 'bg-emerald text-white rounded-br-sm'
                        : 'bg-white border border-slate-100 text-slate-800 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    {m.image_url && (
                      <img src={m.image_url} alt="lampiran" className="rounded-lg mb-2 max-h-48 w-auto" />
                    )}
                    <p className="text-[13px] whitespace-pre-line leading-relaxed">{m.content}</p>
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex justify-start mb-3">
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                    <IonSpinner name="dots" color="primary" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </IonContent>

      <IonFooter className="ion-no-border">
        <div className="bg-white border-t border-slate-100 px-3 py-2">
          {/* Image preview */}
          {imagePreview && (
            <div className="relative inline-block mb-2">
              <img src={imagePreview} alt="preview" className="h-16 w-16 object-cover rounded-lg" />
              <button type="button" onClick={clearImage} className="absolute -top-1.5 -right-1.5">
                <IonIcon icon={closeCircle} className="text-slate-600 text-lg bg-white rounded-full" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-1.5">
            <IonButton fill="clear" size="small" className="m-0" onClick={() => galleryRef.current?.click()}>
              <IonIcon slot="icon-only" icon={imageOutline} className="text-slate-500" />
            </IonButton>
            <IonButton fill="clear" size="small" className="m-0" onClick={() => cameraRef.current?.click()}>
              <IonIcon slot="icon-only" icon={cameraOutline} className="text-slate-500" />
            </IonButton>
            <div className="flex-1 bg-slate-100 rounded-2xl px-3">
              <IonTextarea
                value={input}
                onIonInput={(e) => setInput(e.detail.value ?? '')}
                placeholder="Tulis pesan..."
                autoGrow
                rows={1}
                className="text-sm"
              />
            </div>
            <IonButton
              shape="round"
              size="small"
              className="m-0"
              disabled={sending || (!input.trim() && !image)}
              onClick={() => void handleSend()}
            >
              <IonIcon slot="icon-only" icon={send} />
            </IonButton>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onFileSelected} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFileSelected} />
      </IonFooter>

      {/* Lahan selector modal */}
      <IonModal isOpen={showLahanModal} onDidDismiss={() => setShowLahanModal(false)} initialBreakpoint={0.6} breakpoints={[0, 0.6, 0.9]}>
        <IonContent className="ion-padding">
          <p className="text-sm font-semibold text-slate-700 mb-2">Pilih Tanaman</p>
          <IonRadioGroup
            value={selectedLahan?.client_uuid ?? ''}
            onIonChange={(e) => {
              const uuid = e.detail.value as string;
              setSelectedLahan(lahanList.find((l) => l.client_uuid === uuid) ?? null);
              setShowLahanModal(false);
            }}
          >
            <IonList>
              <IonItem button onClick={() => { setSelectedLahan(null); setShowLahanModal(false); }}>
                <IonIcon icon={addCircleOutline} slot="start" className="text-slate-400" />
                <IonLabel className="text-sm">Tanpa tanaman spesifik</IonLabel>
              </IonItem>
              {lahanList.map((l) => (
                <IonItem key={l.client_uuid}>
                  <IonIcon icon={leafOutline} slot="start" className="text-emerald-600" />
                  <IonLabel className="text-sm">
                    {l.komoditas}
                    <p className="text-[11px] text-slate-400">Bed {l.nomor_bed}</p>
                  </IonLabel>
                  <IonRadio slot="end" value={l.client_uuid} />
                </IonItem>
              ))}
            </IonList>
          </IonRadioGroup>
          <p className="text-[11px] text-slate-400 mt-2">
            Tanaman yang dipilih akan menjadi konteks konsultasi AI mulai pesan berikutnya.
          </p>
        </IonContent>
      </IonModal>
    </IonPage>
  );
}
