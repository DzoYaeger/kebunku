import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
  IonCheckbox,
  IonSearchbar,
  useIonViewWillEnter,
  useIonViewWillLeave,
} from '@ionic/react';
import { send, imageOutline, cameraOutline, leafOutline, closeCircle, sparkles, atOutline, chevronDown, chevronUp } from 'ionicons/icons';
import { getSession, sendMessage } from '../../api/chat';
import { lahanRepo } from '../../db/repository';
import { CommodityAvatar } from '../../components/CommodityAvatar';
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
  const [selectedLahan, setSelectedLahan] = useState<LahanLocal[]>([]);

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLIonContentElement>(null);

  // Hide tab bar saat masuk ChatRoom
  useIonViewWillEnter(() => {
    document.querySelector('ion-tabs')?.classList.add('hide-tab-bar');
  });
  useIonViewWillLeave(() => {
    document.querySelector('ion-tabs')?.classList.remove('hide-tab-bar');
  });

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
        if (match) setSelectedLahan([match]);
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
      const res = await sendMessage(sessionId, text, sentImage, selectedLahan[0]?.server_id ?? null);
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
          {/* Selected lahan badges */}
          {selectedLahan.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedLahan.map((l) => (
                <span key={l.client_uuid} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <IonIcon icon={leafOutline} className="text-xs" />
                  {l.komoditas} (Bed {l.nomor_bed})
                  <button type="button" onClick={() => setSelectedLahan((prev) => prev.filter((x) => x.client_uuid !== l.client_uuid))}>
                    <IonIcon icon={closeCircle} className="text-sm text-emerald-400" />
                  </button>
                </span>
              ))}
            </div>
          )}
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
            <IonButton fill="clear" size="small" className="m-0" onClick={() => setShowLahanModal(true)}>
              <IonIcon slot="icon-only" icon={atOutline} className="text-emerald-600" />
            </IonButton>
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

      {/* Lahan selector modal — multi-select with search, grouping, filter */}
      <IonModal isOpen={showLahanModal} onDidDismiss={() => setShowLahanModal(false)} initialBreakpoint={0.7} breakpoints={[0, 0.7, 0.95]}>
        <LahanSelectorContent
          lahanList={lahanList}
          selectedLahan={selectedLahan}
          setSelectedLahan={setSelectedLahan}
          onClose={() => setShowLahanModal(false)}
        />
      </IonModal>
    </IonPage>
  );
}

/* ─── Lahan Selector Sub-component ─── */
interface SelectorProps {
  lahanList: LahanLocal[];
  selectedLahan: LahanLocal[];
  setSelectedLahan: React.Dispatch<React.SetStateAction<LahanLocal[]>>;
  onClose: () => void;
}

function LahanSelectorContent({ lahanList, selectedLahan, setSelectedLahan, onClose }: SelectorProps): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [filterKomoditas, setFilterKomoditas] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Unique komoditas list for filter chips
  const komoditasList = useMemo(() => {
    const set = new Map<string, string>();
    for (const l of lahanList) {
      const key = l.komoditas.trim().toLowerCase();
      if (!set.has(key)) set.set(key, l.komoditas.trim());
    }
    return [...set.values()].sort((a, b) => a.localeCompare(b, 'id'));
  }, [lahanList]);

  // Filtered list
  const filtered = useMemo(() => {
    let result = lahanList;
    if (filterKomoditas) {
      result = result.filter((l) => l.komoditas.trim().toLowerCase() === filterKomoditas.toLowerCase());
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((l) => l.komoditas.toLowerCase().includes(q) || l.nomor_bed.toLowerCase().includes(q));
    }
    return result;
  }, [lahanList, filterKomoditas, search]);

  // Grouped
  const groups = useMemo(() => {
    const map = new Map<string, { nama: string; items: LahanLocal[] }>();
    for (const l of filtered) {
      const key = l.komoditas.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) existing.items.push(l);
      else map.set(key, { nama: l.komoditas.trim(), items: [l] });
    }
    return [...map.values()];
  }, [filtered]);

  const toggleGroup = (key: string): void => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <IonContent className="ion-padding">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-slate-800">Pilih Tanaman Konteks</p>
        {selectedLahan.length > 0 && (
          <button type="button" onClick={() => setSelectedLahan([])} className="text-[11px] text-red-500 font-medium">
            Hapus semua
          </button>
        )}
      </div>

      {/* Search */}
      <IonSearchbar
        className="kbn-search"
        placeholder="Cari tanaman atau bed..."
        value={search}
        onIonInput={(e) => setSearch(e.detail.value ?? '')}
        debounce={150}
      />

      {/* Filter chips komoditas */}
      {komoditasList.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            type="button"
            onClick={() => setFilterKomoditas(null)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-colors ${
              !filterKomoditas ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            Semua
          </button>
          {komoditasList.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilterKomoditas(filterKomoditas === k ? null : k)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-colors flex items-center gap-1 ${
                filterKomoditas === k ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <CommodityAvatar komoditas={k} className="!w-4 !h-4 !text-[10px] !rounded-full" />
              {k}
            </button>
          ))}
        </div>
      )}

      {/* Grouped list */}
      {filtered.length === 0 ? (
        <p className="text-center text-[11px] text-slate-400 py-6">Tidak ada tanaman ditemukan.</p>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => {
            const key = g.nama.toLowerCase();
            const isCollapsed = collapsedGroups.has(key);
            return (
              <div key={key}>
                <button
                  type="button"
                  onClick={() => toggleGroup(key)}
                  className="flex items-center gap-2 w-full text-left px-1 py-1.5"
                >
                  <CommodityAvatar komoditas={g.nama} className="!w-7 !h-7 !text-sm !rounded-lg" />
                  <span className="text-[13px] font-bold text-slate-700 flex-1">{g.nama}</span>
                  <span className="text-[10px] text-slate-400 mr-1">{g.items.length}</span>
                  <IonIcon icon={isCollapsed ? chevronDown : chevronUp} className="text-slate-400 text-sm" />
                </button>
                {!isCollapsed && (
                  <IonList className="ml-2">
                    {g.items.map((l) => {
                      const isChecked = selectedLahan.some((s) => s.client_uuid === l.client_uuid);
                      return (
                        <IonItem key={l.client_uuid} lines="none" className="mb-0.5">
                          <IonCheckbox
                            slot="start"
                            checked={isChecked}
                            className="kbn-checkbox-lg"
                            onIonChange={(e) => {
                              if (e.detail.checked) {
                                setSelectedLahan((prev) => [...prev, l]);
                              } else {
                                setSelectedLahan((prev) => prev.filter((x) => x.client_uuid !== l.client_uuid));
                              }
                            }}
                          />
                          <IonLabel>
                            <p className="text-[13px] font-medium text-slate-800">Bed {l.nomor_bed}</p>
                            <p className="text-[10px] text-slate-400">{l.status}</p>
                          </IonLabel>
                        </IonItem>
                      );
                    })}
                  </IonList>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Done button */}
      <IonButton expand="block" className="mt-4" onClick={onClose}>
        Selesai ({selectedLahan.length} dipilih)
      </IonButton>
    </IonContent>
  );
}
