import { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonIcon,
  IonButton,
  IonToast,
  IonAlert,
  IonSpinner,
  IonModal,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  flaskOutline,
  leafOutline,
  swapHorizontalOutline,
  bugOutline,
  trashOutline,
  sparklesOutline,
  checkmarkCircle,
  ellipseOutline,
  saveOutline,
  alertCircleOutline,
  cameraOutline,
} from 'ionicons/icons';
import type { LahanLocal, AktivitasLocal } from '../../db';
import type { AktivitasTipe, CarePlan, CarePlanScheduleItem } from '../../types';
import { lahanRepo, aktivitasRepo } from '../../db/repository';
import { runSync } from '../../sync/SyncEngine';
import { useSyncStore } from '../../store/syncStore';
import { api } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { CommodityAvatar } from '../../components/CommodityAvatar';
import { formatTanggal } from '../../utils/format';
import { AplikasiBahanModal, type BahanInput } from './AplikasiBahanModal';

const OFFLINE_MSG = 'Disimpan secara lokal (Mode Offline)';

const PUPUK_SUGGESTIONS = [
  'NPK 16-16-16',
  'MKP',
  'Ultradap',
  'Boron',
  'Magnesium',
  'Urea',
  'KCl',
  'Pupuk Kandang',
  'Kompos',
  'Organik Cair',
  'ZA',
];

const TIPE_META: Record<AktivitasTipe, { label: string; icon: string; bg: string; fg: string }> = {
  semai: { label: 'Semai', icon: leafOutline, bg: '#FEF3C7', fg: '#B45309' },
  pindah_tanam: { label: 'Pindah Tanam', icon: swapHorizontalOutline, bg: '#DCFCE7', fg: '#15803D' },
  pemupukan: { label: 'Pemupukan', icon: flaskOutline, bg: '#E0F2FE', fg: '#0369A1' },
  pestisida: { label: 'Pestisida', icon: bugOutline, bg: '#FFE4E6', fg: '#BE123C' },
};

// Pisah string "A, B, C" menjadi chip individual.
function splitBahan(s: string | null): string[] {
  if (!s) return [];
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

type Mode = 'pupuk' | 'pestisida' | null;

export default function TanamanDetailPage(): React.JSX.Element {
  const { uuid } = useParams<{ uuid: string }>();
  const [lahan, setLahan] = useState<LahanLocal | null>(null);
  const [aktivitas, setAktivitas] = useState<AktivitasLocal[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AktivitasLocal | null>(null);
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  // Keluhan
  const [keluhanOpen, setKeluhanOpen] = useState(false);
  const [keluhanText, setKeluhanText] = useState('');
  const [keluhanImage, setKeluhanImage] = useState<File | null>(null);
  const [keluhanPreview, setKeluhanPreview] = useState<string | null>(null);
  const [keluhanLoading, setKeluhanLoading] = useState(false);
  const [keluhanResult, setKeluhanResult] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  interface KeluhanEntry { id: number; session_id: string | null; keluhan_text: string | null; saran: string; outcome: string; created_at: string }
  const [keluhanHistory, setKeluhanHistory] = useState<KeluhanEntry[]>([]);
  const refreshCounts = useSyncStore((s) => s.refreshCounts);

  const loadKeluhanHistory = useCallback(async (): Promise<void> => {
    if (!lahan?.server_id) return;
    try {
      const res = await api.get<{ data: KeluhanEntry[] }>(`/perawatan/saran-ai/${lahan.server_id}`);
      setKeluhanHistory(res.data.data);
    } catch { /* silent */ }
  }, [lahan?.server_id]);

  // Group history by session
  const keluhanSessions = useMemo(() => {
    const map = new Map<string, KeluhanEntry[]>();
    for (const entry of keluhanHistory) {
      const key = entry.session_id || entry.id.toString();
      const list = map.get(key) || [];
      list.push(entry);
      map.set(key, list);
    }
    // Sort sessions by newest first, entries within session oldest first
    return [...map.entries()].map(([sid, entries]) => ({
      session_id: sid,
      entries: entries.sort((a, b) => a.created_at.localeCompare(b.created_at)),
      outcome: entries[entries.length - 1].outcome,
      lastDate: entries[entries.length - 1].created_at,
    })).sort((a, b) => b.lastDate.localeCompare(a.lastDate));
  }, [keluhanHistory]);

  const updateOutcome = async (sessionId: string, outcome: 'success' | 'failed'): Promise<void> => {
    // Update all entries in this session
    const entries = keluhanHistory.filter((h) => (h.session_id || h.id.toString()) === sessionId);
    for (const e of entries) {
      await api.put(`/perawatan/saran-ai/${e.id}/outcome`, { outcome }).catch(() => undefined);
    }
    setKeluhanHistory((prev) => prev.map((h) => (h.session_id || h.id.toString()) === sessionId ? { ...h, outcome } : h));
    setToast(outcome === 'success' ? '✅ Ditandai berhasil' : '❌ Ditandai tidak berhasil');
  };

  const reload = useCallback(async (): Promise<void> => {
    const l = await lahanRepo.get(uuid);
    if (!l) {
      setNotFound(true);
      return;
    }
    setLahan(l);
    setAktivitas(await aktivitasRepo.listByLahan(uuid));
    // Fetch care plan if lahan has server_id
    if (l.server_id) {
      api.get<{ data: CarePlan[] }>('/care-plans', { params: { lahan_id: l.server_id } })
        .then((res) => setCarePlan(res.data.data[0] ?? null))
        .catch(() => undefined);
    }
  }, [uuid]);

  useIonViewWillEnter(() => {
    void reload();
  });

  const pemupukan = useMemo(() => aktivitas.filter((a) => a.tipe === 'pemupukan'), [aktivitas]);
  const pestisida = useMemo(() => aktivitas.filter((a) => a.tipe === 'pestisida'), [aktivitas]);
  const lainnya = useMemo(
    () => aktivitas.filter((a) => a.tipe === 'semai' || a.tipe === 'pindah_tanam'),
    [aktivitas],
  );

  // Saran jenis pupuk: bawaan + yang pernah dipakai.
  const pupukOptions = useMemo(() => {
    const used = pemupukan.flatMap((p) => splitBahan(p.jenis_pupuk));
    return Array.from(new Set([...PUPUK_SUGGESTIONS, ...used]));
  }, [pemupukan]);

  const handleSubmit = async (input: BahanInput): Promise<void> => {
    const joined = input.bahan.join(', ');
    await aktivitasRepo.create({
      lahan_uuid: uuid,
      tipe: mode === 'pestisida' ? 'pestisida' : 'pemupukan',
      tanggal: input.tanggal,
      jenis_pupuk: mode === 'pupuk' ? joined : null,
      jenis_pestisida: mode === 'pestisida' ? joined : null,
      catatan: input.catatan,
    });
    await reload();
    await refreshCounts();
    if (navigator.onLine) void runSync().then(reload);
    else setToast(OFFLINE_MSG);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!toDelete) return;
    await aktivitasRepo.remove(toDelete.client_uuid);
    setToDelete(null);
    await reload();
    await refreshCounts();
    if (navigator.onLine) void runSync().then(reload);
    else setToast(OFFLINE_MSG);
  };

  const renderBahanItem = (
    a: AktivitasLocal,
    bahan: string[],
    icon: string,
    bg: string,
    fg: string,
  ): React.JSX.Element => (
    <IonItemSliding key={a.client_uuid}>
      <div className="kbn-card p-3.5 flex items-start gap-3 mb-3">
        <div className="kbn-avatar shrink-0" style={{ background: bg, color: fg }}>
          <IonIcon icon={icon} className="text-xl" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            {bahan.length > 0 ? (
              bahan.map((b) => (
                <span key={b} className="badge" style={{ background: bg, color: fg }}>
                  {b}
                </span>
              ))
            ) : (
              <span className="text-heading-md text-slate-dark">—</span>
            )}
          </div>
          <p className="text-caption text-slate-muted mt-1.5">
            {formatTanggal(a.tanggal)}
            {a.catatan ? ` · ${a.catatan}` : ''}
          </p>
        </div>
      </div>
      <IonItemOptions side="end">
        <IonItemOption color="danger" onClick={() => setToDelete(a)}>
          <IonIcon slot="icon-only" icon={trashOutline} />
        </IonItemOption>
      </IonItemOptions>
    </IonItemSliding>
  );

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/app/tanaman" text="Tanaman" />
          </IonButtons>
          <IonTitle>{lahan?.komoditas ?? 'Detail'}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {notFound ? (
          <div className="text-center text-slate-muted mt-24 px-8">
            <p className="text-body">Tanaman tidak ditemukan atau sudah dihapus.</p>
          </div>
        ) : lahan ? (
          <div className="px-4 pt-2 pb-28">
            {/* Header tanaman */}
            <div className="kbn-card kbn-fade-up p-4 flex items-center gap-3.5 mb-4">
              <CommodityAvatar komoditas={lahan.komoditas} className="!w-14 !h-14 !text-2xl !rounded-2xl" />
              <div className="min-w-0 flex-1">
                <h1 className="text-heading-lg text-slate-dark truncate">{lahan.komoditas}</h1>
                <p className="text-caption text-slate-muted mt-0.5">Bed {lahan.nomor_bed}</p>
              </div>
              <StatusBadge status={lahan.status} />
            </div>

            {lahan.catatan && (
              <div className="kbn-card p-3.5 mb-4">
                <p className="text-caption text-slate-muted">Catatan</p>
                <p className="text-body text-slate-dark mt-1">{lahan.catatan}</p>
              </div>
            )}

            {/* Aksi */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <IonButton size="small" onClick={() => setMode('pupuk')}>
                <IonIcon slot="start" icon={flaskOutline} />
                Pupuk
              </IonButton>
              <IonButton size="small" fill="outline" onClick={() => setMode('pestisida')}>
                <IonIcon slot="start" icon={bugOutline} />
                Pestisida
              </IonButton>
              <IonButton size="small" fill="outline" color="warning" onClick={() => { setKeluhanOpen(true); setActiveSessionId(null); setKeluhanResult(null); void loadKeluhanHistory(); }}>
                <IonIcon slot="start" icon={alertCircleOutline} />
                Keluhan
              </IonButton>
            </div>

            {/* Rencana Perawatan (Checklist) */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-heading-md text-slate-dark">Rencana Perawatan</h2>
                <button
                  type="button"
                  onClick={async () => {
                    if (!lahan?.server_id) { setToast('Tanaman belum tersinkron ke server.'); return; }
                    setGenerating(true);
                    try {
                      const res = await api.post<{ data: CarePlan }>('/care-plans/generate', { lahan_id: lahan.server_id });
                      setCarePlan(res.data.data);
                      setToast('✅ Rencana perawatan berhasil dibuat!');
                    } catch { setToast('Gagal generate. Coba lagi.'); }
                    finally { setGenerating(false); }
                  }}
                  disabled={generating}
                  className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg active:bg-emerald-100 disabled:opacity-50 touch-manipulation"
                >
                  {generating ? <IonSpinner name="dots" className="w-3 h-3" /> : <IonIcon icon={sparklesOutline} className="text-sm" />}
                  {carePlan ? 'Regenerate' : 'Generate AI'}
                </button>
              </div>

              {carePlan ? (
                <div className="kbn-card p-3.5">
                  <p className="text-[11px] text-slate-500 mb-2">{carePlan.summary}</p>
                  <div className="space-y-2">
                    {(carePlan.schedule ?? []).map((item: CarePlanScheduleItem, idx: number) => {
                      const completed = (carePlan.completed_items ?? []);
                      const isDone = completed.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await api.put<{ data: { completed_items: number[] } }>(`/care-plans/${carePlan.id}/toggle`, { index: idx });
                              setCarePlan({ ...carePlan, completed_items: res.data.data.completed_items });
                            } catch { /* silent */ }
                          }}
                          className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-colors touch-manipulation ${isDone ? 'bg-green-50 border border-green-100' : 'bg-slate-50 border border-slate-100'}`}
                        >
                          <IonIcon
                            icon={isDone ? checkmarkCircle : ellipseOutline}
                            className={`text-lg mt-0.5 shrink-0 ${isDone ? 'text-green-600' : 'text-slate-300'}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className={`text-[12px] font-semibold ${isDone ? 'text-green-700 line-through' : 'text-slate-800'}`}>
                              Minggu {item.minggu} · {item.aktivitas}
                            </p>
                            {item.kocor && (
                              <p className="text-[11px] text-blue-700 mt-0.5">🫗 Kocor: {item.kocor}</p>
                            )}
                            {item.benam && (
                              <p className="text-[11px] text-amber-700 mt-0.5">🌱 Benam: {item.benam}</p>
                            )}
                            {!item.kocor && !item.benam && item.detail && (
                              <p className="text-[11px] text-slate-600 mt-0.5">{item.detail}</p>
                            )}
                            {item.catatan && <p className="text-[10px] text-slate-400 mt-0.5 italic">{item.catatan}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {/* Save as template */}
                  <button
                    type="button"
                    onClick={async () => {
                      const nama = prompt('Nama template rencana:');
                      if (!nama?.trim()) return;
                      setSavingTemplate(true);
                      try {
                        await api.post('/plan-templates', { care_plan_id: carePlan.id, nama: nama.trim() });
                        setToast('✅ Template tersimpan!');
                      } catch { setToast('Gagal menyimpan template.'); }
                      finally { setSavingTemplate(false); }
                    }}
                    disabled={savingTemplate}
                    className="flex items-center gap-1.5 mt-3 text-[11px] font-semibold text-slate-600 bg-slate-100 px-3 py-2 rounded-lg w-full justify-center active:bg-slate-200 touch-manipulation"
                  >
                    <IonIcon icon={saveOutline} className="text-sm" />
                    Simpan sebagai Template
                  </button>
                </div>
              ) : (
                <div className="kbn-card p-5 text-center text-slate-muted">
                  <IonIcon icon={sparklesOutline} className="text-3xl mb-2" />
                  <p className="text-body">Belum ada rencana. Tap "Generate AI" untuk membuat jadwal perawatan otomatis.</p>
                </div>
              )}
            </div>

            {/* Riwayat Pemupukan */}
            <h2 className="text-heading-md text-slate-dark mb-2 px-1">Riwayat Pemupukan</h2>
            {pemupukan.length === 0 ? (
              <div className="kbn-card p-5 text-center text-slate-muted mb-5">
                <IonIcon icon={flaskOutline} className="text-3xl mb-2" />
                <p className="text-body">Belum ada pemupukan.</p>
              </div>
            ) : (
              <div className="kbn-stagger mb-5">
                {pemupukan.map((p) =>
                  renderBahanItem(p, splitBahan(p.jenis_pupuk), flaskOutline, '#E0F2FE', '#0369A1'),
                )}
              </div>
            )}

            {/* Riwayat Pestisida */}
            <h2 className="text-heading-md text-slate-dark mb-2 px-1">Riwayat Pestisida</h2>
            {pestisida.length === 0 ? (
              <div className="kbn-card p-5 text-center text-slate-muted mb-5">
                <IonIcon icon={bugOutline} className="text-3xl mb-2" />
                <p className="text-body">Belum ada penyemprotan pestisida.</p>
              </div>
            ) : (
              <div className="kbn-stagger mb-5">
                {pestisida.map((p) =>
                  renderBahanItem(p, splitBahan(p.jenis_pestisida), bugOutline, '#FFE4E6', '#BE123C'),
                )}
              </div>
            )}

            {/* Aktivitas lain */}
            {lainnya.length > 0 && (
              <>
                <h2 className="text-heading-md text-slate-dark mb-2 px-1">Aktivitas Lain</h2>
                <div className="kbn-stagger">
                  {lainnya.map((a) => {
                    const meta = TIPE_META[a.tipe];
                    return (
                      <div key={a.client_uuid} className="kbn-card p-3.5 flex items-center gap-3 mb-3">
                        <div className="kbn-avatar" style={{ background: meta.bg, color: meta.fg }}>
                          <IonIcon icon={meta.icon} className="text-xl" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-heading-md text-slate-dark truncate">{meta.label}</p>
                          <p className="text-caption text-slate-muted mt-0.5">{formatTanggal(a.tanggal)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="px-4 pt-4 space-y-3">
            <div className="kbn-skeleton h-20 w-full !rounded-2xl" />
            <div className="kbn-skeleton h-24 w-full !rounded-2xl" />
          </div>
        )}

        <AplikasiBahanModal
          isOpen={mode !== null}
          title={mode === 'pestisida' ? 'Semprot Pestisida' : 'Beri Pupuk'}
          itemLabel={mode === 'pestisida' ? 'Pestisida' : 'Jenis Pupuk'}
          namaTanaman={lahan ? `${lahan.komoditas} (Bed ${lahan.nomor_bed})` : ''}
          suggestions={mode === 'pestisida' ? [] : pupukOptions}
          submitLabel={mode === 'pestisida' ? 'Simpan Pestisida' : 'Simpan Pemupukan'}
          onClose={() => setMode(null)}
          onSubmit={handleSubmit}
        />

        <IonAlert
          isOpen={toDelete !== null}
          header="Hapus catatan?"
          message="Catatan aktivitas ini akan dihapus."
          buttons={[
            { text: 'Batal', role: 'cancel', handler: () => setToDelete(null) },
            { text: 'Hapus', role: 'destructive', handler: () => void confirmDelete() },
          ]}
          onDidDismiss={() => setToDelete(null)}
        />

        <IonToast
          isOpen={toast !== null}
          message={toast ?? ''}
          duration={2000}
          onDidDismiss={() => setToast(null)}
          color="medium"
        />

        {/* Keluhan Modal */}
        <IonModal
          isOpen={keluhanOpen}
          onDidDismiss={() => { setKeluhanOpen(false); setKeluhanResult(null); setKeluhanImage(null); setKeluhanPreview(null); setKeluhanText(''); }}
          initialBreakpoint={1}
          breakpoints={[0, 1]}
        >
          <IonHeader className="ion-no-border">
            <IonToolbar>
              <IonTitle className="text-sm font-semibold">Keluhan & Konsultasi</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setKeluhanOpen(false)}>Tutup</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <p className="text-[11px] text-slate-500 mb-3">{lahan?.komoditas} · Bed {lahan?.nomor_bed}</p>

            {/* Riwayat keluhan */}
            <div className="space-y-2 mb-4">
              {keluhanSessions.length === 0 && !keluhanResult ? (
                <div className="text-center py-6 text-slate-400">
                  <IonIcon icon={alertCircleOutline} className="text-3xl mb-1" />
                  <p className="text-[11px]">Belum ada riwayat keluhan. Laporkan masalah tanaman di bawah.</p>
                </div>
              ) : (
                <>
                  {keluhanSessions.map((session) => (
                    <div key={session.session_id} className={`rounded-xl border overflow-hidden ${session.outcome === 'success' ? 'border-green-200 bg-green-50/50' : session.outcome === 'failed' ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-white'}`}>
                      {/* Session header */}
                      <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${session.outcome === 'success' ? 'bg-green-100 text-green-700' : session.outcome === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {session.outcome === 'success' ? '✅ Teratasi' : session.outcome === 'failed' ? '❌ Tidak berhasil' : '⏳ Aktif'}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-auto">{new Date(session.entries[0].created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      {/* Conversation thread */}
                      <div className="px-3 pb-2.5 space-y-2">
                        {session.entries.map((entry) => (
                          <div key={entry.id} className="text-[11px]">
                            {/* User question */}
                            <div className="flex gap-2 mb-1">
                              <span className="text-[10px] font-bold text-slate-500 shrink-0 mt-0.5">Q:</span>
                              <p className="text-slate-700">{entry.keluhan_text || '(foto)'}</p>
                            </div>
                            {/* AI answer */}
                            <details className="ml-4">
                              <summary className="text-emerald-700 font-medium cursor-pointer list-none">
                                {entry.saran.slice(0, 80)}… <span className="text-emerald-600 text-[10px]">selengkapnya</span>
                              </summary>
                              <p className="text-slate-700 whitespace-pre-line leading-relaxed mt-1">{entry.saran}</p>
                            </details>
                          </div>
                        ))}
                      </div>
                      {/* Actions for pending sessions */}
                      {session.outcome === 'pending' && (
                        <div className="flex border-t border-slate-100">
                          <button type="button" onClick={() => { setActiveSessionId(session.session_id); }} className="flex-1 py-2 text-[10px] font-semibold text-blue-700 active:bg-blue-50">+ Follow up</button>
                          <button type="button" onClick={() => void updateOutcome(session.session_id, 'success')} className="flex-1 py-2 text-[10px] font-semibold text-green-700 active:bg-green-50 border-l border-slate-100">✅ Berhasil</button>
                          <button type="button" onClick={() => void updateOutcome(session.session_id, 'failed')} className="flex-1 py-2 text-[10px] font-semibold text-red-700 active:bg-red-50 border-l border-slate-100">❌ Gagal</button>
                        </div>
                      )}
                    </div>
                  ))}
                  {keluhanResult && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-[11px]">
                      <p className="font-semibold text-emerald-800 mb-1 flex items-center gap-1">
                        <IonIcon icon={sparklesOutline} className="text-sm" /> Solusi AI (terbaru)
                      </p>
                      <p className="text-slate-700 whitespace-pre-line leading-relaxed">{keluhanResult}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Input area */}
            <div className="border-t border-slate-100 pt-3 pb-2">
              <textarea
                placeholder="Jelaskan keluhan atau follow-up..."
                value={keluhanText}
                onChange={(e) => setKeluhanText(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald resize-none"
              />

              {/* Foto preview */}
              {keluhanPreview && (
                <div className="relative mt-2 inline-block">
                  <img src={keluhanPreview} alt="" className="w-16 h-16 rounded-lg object-cover border" />
                  <button type="button" onClick={() => { setKeluhanImage(null); setKeluhanPreview(null); }} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">✕</button>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-3">
                <label className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 cursor-pointer active:bg-slate-50 touch-manipulation">
                  <IonIcon icon={cameraOutline} className="text-lg text-slate-600" />
                  <span className="text-xs text-slate-700 font-medium">Foto</span>
                  <input type="file" accept="image/*" capture="environment" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setKeluhanImage(f); setKeluhanPreview(URL.createObjectURL(f)); }
                  }} className="hidden" />
                </label>

                <button
                  type="button"
                  disabled={keluhanLoading || (!keluhanText.trim() && !keluhanImage)}
                  onClick={async () => {
                    if (!lahan?.server_id) { setToast('Tanaman belum tersinkron.'); return; }
                    setKeluhanLoading(true);
                    try {
                      const fd = new FormData();
                      fd.append('lahan_id', String(lahan.server_id));
                      if (keluhanText.trim()) fd.append('keluhan', keluhanText.trim());
                      if (keluhanImage) fd.append('image', keluhanImage);
                      if (activeSessionId) fd.append('session_id', activeSessionId);
                      const res = await api.post<{ data: { id: number; session_id: string; solusi: string } }>('/perawatan/keluhan', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                      setKeluhanResult(res.data.data.solusi);
                      setActiveSessionId(res.data.data.session_id);
                      setKeluhanText('');
                      setKeluhanImage(null);
                      setKeluhanPreview(null);
                      void loadKeluhanHistory();
                      api.get<{ data: CarePlan[] }>('/care-plans', { params: { lahan_id: lahan.server_id } })
                        .then((r) => setCarePlan(r.data.data[0] ?? null)).catch(() => undefined);
                    } catch { setKeluhanResult('Gagal mendapatkan solusi. Coba lagi.'); }
                    finally { setKeluhanLoading(false); }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:bg-emerald-700 touch-manipulation"
                >
                  {keluhanLoading ? <IonSpinner name="dots" className="w-4 h-4" /> : <IonIcon icon={sparklesOutline} className="text-base" />}
                  {keluhanLoading ? 'Menganalisis...' : 'Kirim Keluhan'}
                </button>
              </div>
            </div>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
}
