import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonIcon,
  IonSpinner,
  IonTextarea,
  IonButton,
  IonButtons,
  IonModal,
  IonList,
  IonItem,
  IonLabel,
  IonCheckbox,
  IonSearchbar,
  useIonViewWillEnter,
  useIonViewWillLeave,
} from '@ionic/react';
import {
  send,
  imageOutline,
  cameraOutline,
  leafOutline,
  closeCircle,
  sparkles,
  atOutline,
  addOutline,
  menuOutline,
  closeOutline,
  trashOutline,
  chatbubbleEllipses,
  chevronDown,
  chevronUp,
  alertCircleOutline,
} from 'ionicons/icons';
import { listSessions, createSession, getSession, deleteSession, sendMessage, toggleKeluhanSession } from '../../api/chat';
import { lahanRepo } from '../../db/repository';
import { CommodityAvatar } from '../../components/CommodityAvatar';
import type { LahanLocal } from '../../db';
import type { ChatMessage, ChatSession } from '../../types';

export default function ChatPage(): React.JSX.Element {
  const location = useLocation();

  // Sessions state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Active session state
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Keluhan mode toggle (mirip Canvas di Gemini)
  const [keluhanMode, setKeluhanMode] = useState(false);

  // Lahan selector
  const [lahanList, setLahanList] = useState<LahanLocal[]>([]);
  const [showLahanModal, setShowLahanModal] = useState(false);
  const [selectedLahan, setSelectedLahan] = useState<LahanLocal[]>([]);

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLIonContentElement>(null);
  const initRef = useRef(false);

  // Hide tab bar
  useIonViewWillEnter(() => {
    document.querySelector('ion-tabs')?.classList.add('hide-tab-bar');
  });
  useIonViewWillLeave(() => {
    document.querySelector('ion-tabs')?.classList.remove('hide-tab-bar');
  });

  const scrollToBottom = useCallback(() => {
    setTimeout(() => void contentRef.current?.scrollToBottom(300), 100);
  }, []);

  // Fetch sessions list
  const fetchSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      setSessions(await listSessions());
    } catch { /* silent */ }
    finally { setLoadingSessions(false); }
  }, []);

  // Load lahan list once
  useEffect(() => {
    void (async () => {
      const lahan = await lahanRepo.list();
      setLahanList(lahan.filter((l) => l.server_id !== null));
    })();
  }, []);

  useIonViewWillEnter(() => {
    void fetchSessions();
  });

  // Handle query params from TanamanDetailPage: ?keluhan=1&lahan_id=X&session_id=Y
  useEffect(() => {
    if (initRef.current) return;
    const params = new URLSearchParams(location.search);
    const isKeluhan = params.get('keluhan') === '1';
    const lahanId = params.get('lahan_id');
    const sessionId = params.get('session_id');

    if (isKeluhan && lahanId) {
      initRef.current = true;
      setKeluhanMode(true);

      if (sessionId) {
        // Open existing session directly
        const id = Number(sessionId);
        setActiveSessionId(id);
        setLoadingChat(true);
        void (async () => {
          try {
            const s = await getSession(id);
            setSession(s);
            setMessages(s.messages ?? []);
            setKeluhanMode(s.is_keluhan);
            if (s.lahan) {
              const match = lahanList.find((l) => l.server_id === s.lahan?.id);
              if (match) setSelectedLahan([match]);
            }
            scrollToBottom();
          } catch { /* silent */ }
          finally { setLoadingChat(false); }
        })();
      } else {
        // Auto create keluhan session for this lahan
        void (async () => {
          try {
            const s = await createSession(Number(lahanId), true);
            setSessions((prev) => [s, ...prev]);
            setActiveSessionId(s.id);
            setSession(s);
            setMessages([]);
            const match = lahanList.find((l) => l.server_id === Number(lahanId));
            if (match) setSelectedLahan([match]);
          } catch { /* silent */ }
        })();
      }
    }
  }, [location.search, lahanList, scrollToBottom]);

  // Load session messages
  const loadSession = useCallback(async (id: number) => {
    setActiveSessionId(id);
    setLoadingChat(true);
    setSidebarOpen(false);
    try {
      const s = await getSession(id);
      setSession(s);
      setMessages(s.messages ?? []);
      setKeluhanMode(s.is_keluhan);
      if (s.lahan) {
        const match = lahanList.find((l) => l.server_id === s.lahan?.id);
        if (match) setSelectedLahan([match]);
        else setSelectedLahan([]);
      } else {
        setSelectedLahan([]);
      }
      scrollToBottom();
    } catch { /* silent */ }
    finally { setLoadingChat(false); }
  }, [lahanList, scrollToBottom]);

  // Create new session
  const startNew = async (): Promise<void> => {
    try {
      const s = await createSession(null, false);
      setSessions((prev) => [s, ...prev]);
      setActiveSessionId(s.id);
      setSession(s);
      setMessages([]);
      setSelectedLahan([]);
      setKeluhanMode(false);
      setSidebarOpen(false);
    } catch { /* silent */ }
  };

  // Toggle keluhan mode on current session
  const handleToggleKeluhan = async (): Promise<void> => {
    const newVal = !keluhanMode;
    setKeluhanMode(newVal);
    if (activeSessionId) {
      try {
        const updated = await toggleKeluhanSession(activeSessionId, newVal, selectedLahan[0]?.server_id ?? null);
        setSession(updated);
        setSessions((prev) => prev.map((s) => s.id === activeSessionId ? { ...s, is_keluhan: newVal } : s));
      } catch { /* revert on failure */
        setKeluhanMode(!newVal);
      }
    }
  };

  // Delete session
  const removeSession = async (id: number): Promise<void> => {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setSession(null);
      setMessages([]);
    }
  };

  // Image handling
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

  // Send message
  const handleSend = async (): Promise<void> => {
    const text = input.trim();
    if (!text && !image) return;
    if (!activeSessionId) return;
    setSending(true);

    const tempId = Date.now();
    const optimistic: ChatMessage = {
      id: tempId,
      chat_session_id: activeSessionId,
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
      const res = await sendMessage(activeSessionId, text, sentImage, selectedLahan[0]?.server_id ?? null);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        res.user_message,
        res.assistant_message,
      ]);
      // Update session title in sidebar
      if (messages.length === 0 && text) {
        setSessions((prev) =>
          prev.map((s) => s.id === activeSessionId ? { ...s, judul: text.slice(0, 50) } : s),
        );
      }
      scrollToBottom();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          chat_session_id: activeSessionId,
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

  const formatDate = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <IonPage>
      {/* Header */}
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton fill="clear" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <IonIcon slot="icon-only" icon={sidebarOpen ? closeOutline : menuOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle className="text-sm font-semibold">
            {session?.judul ?? 'Konsultasi AI'}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton fill="clear" onClick={() => void startNew()}>
              <IonIcon slot="icon-only" icon={addOutline} className="text-emerald-600" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      {/* Main area */}
      <IonContent ref={contentRef} className="chat-bg" scrollEvents>
        {/* Sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="w-72 max-w-[80vw] bg-white h-full shadow-xl flex flex-col animate-slide-in-left">
              <div className="px-4 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800">Riwayat Konsultasi</p>
                <IonButton fill="clear" size="small" onClick={() => setSidebarOpen(false)}>
                  <IonIcon slot="icon-only" icon={closeOutline} className="text-slate-500" />
                </IonButton>
              </div>
              <div className="px-3 pt-3">
                <button
                  type="button"
                  onClick={() => void startNew()}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] font-semibold"
                >
                  <IonIcon icon={addOutline} className="text-lg" />
                  Konsultasi Baru
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
                {loadingSessions ? (
                  <div className="flex justify-center py-6">
                    <IonSpinner name="crescent" color="primary" />
                  </div>
                ) : sessions.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Belum ada konsultasi.</p>
                ) : (
                  <div className="space-y-1">
                    {sessions.map((s) => (
                      <div
                        key={s.id}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer group transition-colors ${
                          s.id === activeSessionId ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50'
                        }`}
                        onClick={() => void loadSession(s.id)}
                      >
                        <IonIcon
                          icon={s.is_keluhan ? alertCircleOutline : chatbubbleEllipses}
                          className={`text-base flex-shrink-0 ${s.is_keluhan ? 'text-emerald-500' : 'text-emerald-500'}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-slate-700 truncate">{s.judul}</p>
                          <div className="flex items-center gap-1.5">
                            {s.is_keluhan && (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">KONSULTASI</span>
                            )}
                            <p className="text-[10px] text-slate-400">{formatDate(s.updated_at)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void removeSession(s.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1"
                        >
                          <IonIcon icon={trashOutline} className="text-red-400 text-sm" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 bg-black/30" onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Chat area */}
        <div className="px-3 py-4 min-h-full">
          {!activeSessionId ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
                <IonIcon icon={sparkles} className="text-emerald-600 text-4xl" />
              </div>
              <p className="text-base font-bold text-slate-700">Asisten Kebunku</p>
              <p className="text-xs text-slate-500 mt-2 max-w-[280px]">
                Konsultasikan masalah tanamanmu. Mulai konsultasi baru atau pilih dari riwayat.
              </p>
              <button
                type="button"
                onClick={() => void startNew()}
                className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald text-white text-sm font-semibold shadow-md"
              >
                <IonIcon icon={addOutline} className="text-lg" />
                Mulai Konsultasi
              </button>
            </div>
          ) : loadingChat ? (
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
                    {keluhanMode
                      ? 'Ceritakan masalah tanamanmu. Sesi ini ditandai sebagai konsultasi tanaman.'
                      : 'Tanyakan apa saja seputar perawatan, hama, pupuk, atau kirim foto tanamanmu.'}
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
                    <p className={`text-[10px] mt-1 ${m.role === 'user' ? 'text-white/60' : 'text-slate-400'}`}>
                      {new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
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

      {/* Footer input */}
      {activeSessionId && (
        <IonFooter className="ion-no-border">
          <div className="bg-white border-t border-slate-100 px-3 py-2">
            {/* Keluhan toggle + selected lahan */}
            <div className="flex items-center gap-2 mb-2">
              {/* Konsultasi toggle — mirip canvas toggle di Gemini */}
              <button
                type="button"
                onClick={() => void handleToggleKeluhan()}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                  keluhanMode
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}
              >
                <IonIcon icon={alertCircleOutline} className={`text-sm ${keluhanMode ? 'text-emerald-500' : 'text-slate-400'}`} />
                Konsultasi Tanaman
                <span className={`w-2 h-2 rounded-full ${keluhanMode ? 'bg-emerald-400' : 'bg-slate-300'}`} />
              </button>

              {/* Lahan badges */}
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
                  placeholder={keluhanMode ? 'Jelaskan keluhan tanaman...' : 'Tulis pesan...'}
                  autoGrow
                  rows={1}
                  className="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
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
      )}

      {/* Lahan selector modal */}
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

  const komoditasList = useMemo(() => {
    const set = new Map<string, string>();
    for (const l of lahanList) {
      const key = l.komoditas.trim().toLowerCase();
      if (!set.has(key)) set.set(key, l.komoditas.trim());
    }
    return [...set.values()].sort((a, b) => a.localeCompare(b, 'id'));
  }, [lahanList]);

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
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-slate-800">Pilih Tanaman Konteks</p>
        {selectedLahan.length > 0 && (
          <button type="button" onClick={() => setSelectedLahan([])} className="text-[11px] text-red-500 font-medium">
            Hapus semua
          </button>
        )}
      </div>

      <IonSearchbar
        className="kbn-search"
        placeholder="Cari tanaman atau bed..."
        value={search}
        onIonInput={(e) => setSearch(e.detail.value ?? '')}
        debounce={150}
      />

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

      <IonButton expand="block" className="mt-4" onClick={onClose}>
        Selesai ({selectedLahan.length} dipilih)
      </IonButton>
    </IonContent>
  );
}
