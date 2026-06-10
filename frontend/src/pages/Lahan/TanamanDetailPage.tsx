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
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  useIonViewWillEnter,
  useIonRouter,
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
  chatbubbleEllipsesOutline,
  chevronDown,
  chevronUp,
} from 'ionicons/icons';
import type { LahanLocal, AktivitasLocal } from '../../db';
import type { AktivitasTipe, CarePlan, CarePlanScheduleItem, ChatSession } from '../../types';
import { lahanRepo, aktivitasRepo } from '../../db/repository';
import { listKeluhanSessions } from '../../api/chat';
import { runSync } from '../../sync/SyncEngine';
import { useSyncStore } from '../../store/syncStore';
import { api } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { CommodityAvatar } from '../../components/CommodityAvatar';
import { formatTanggal } from '../../utils/format';
import { AplikasiBahanModal, type BahanInput } from './AplikasiBahanModal';

const OFFLINE_MSG = 'Disimpan secara lokal (Mode Offline)';

const PUPUK_SUGGESTIONS = [
  'NPK 16-16-16', 'MKP', 'Ultradap', 'Boron', 'Magnesium',
  'Urea', 'KCl', 'Pupuk Kandang', 'Kompos', 'Organik Cair', 'ZA',
];

const TIPE_META: Record<AktivitasTipe, { label: string; icon: string; bg: string; fg: string }> = {
  semai: { label: 'Semai', icon: leafOutline, bg: '#FEF3C7', fg: '#B45309' },
  pindah_tanam: { label: 'Pindah Tanam', icon: swapHorizontalOutline, bg: '#DCFCE7', fg: '#15803D' },
  pemupukan: { label: 'Pemupukan', icon: flaskOutline, bg: '#E0F2FE', fg: '#0369A1' },
  pestisida: { label: 'Pestisida', icon: bugOutline, bg: '#FFE4E6', fg: '#BE123C' },
};

function splitBahan(s: string | null): string[] {
  if (!s) return [];
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

/** Hitung rentang tanggal untuk minggu ke-n dari tanggal tanam. */
function getWeekRange(tanggalTanam: string | null, minggu: number, totalWeeks: number): string {
  if (!tanggalTanam) return '';
  const start = new Date(tanggalTanam);
  start.setDate(start.getDate() + (minggu - 1) * 7);
  const end = new Date(start);
  const daysInWeek = minggu === totalWeeks ? 3 : 6;
  end.setDate(end.getDate() + daysInWeek);
  const sameMonth = start.getMonth() === end.getMonth();
  const mo = (d: Date): string => d.toLocaleDateString('id-ID', { month: 'short' });
  const yr = end.getFullYear();
  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${mo(end)} ${yr}`;
  }
  return `${start.getDate()} ${mo(start)} – ${end.getDate()} ${mo(end)} ${yr}`;
}

type Mode = 'pupuk' | 'pestisida' | null;

export default function TanamanDetailPage(): React.JSX.Element {
  const { uuid } = useParams<{ uuid: string }>();
  const router = useIonRouter();
  const [lahan, setLahan] = useState<LahanLocal | null>(null);
  const [aktivitas, setAktivitas] = useState<AktivitasLocal[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AktivitasLocal | null>(null);
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Konsultasi sessions
  const [konsultasiSessions, setKonsultasiSessions] = useState<ChatSession[]>([]);
  const [loadingKonsultasi, setLoadingKonsultasi] = useState(false);

  // Collapse/expand sections
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (key: string): void => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const refreshCounts = useSyncStore((s) => s.refreshCounts);

  const loadKonsultasiSessions = useCallback(async (serverId: number): Promise<void> => {
    try {
      setLoadingKonsultasi(true);
      setKonsultasiSessions(await listKeluhanSessions(serverId));
    } catch { /* silent */ }
    finally { setLoadingKonsultasi(false); }
  }, []);

  const reload = useCallback(async (): Promise<void> => {
    const l = await lahanRepo.get(uuid);
    if (!l) { setNotFound(true); return; }
    setLahan(l);
    setAktivitas(await aktivitasRepo.listByLahan(uuid));
    if (l.server_id) {
      api.get<{ data: CarePlan[] }>('/care-plans', { params: { lahan_id: l.server_id } })
        .then((res) => setCarePlan(res.data.data[0] ?? null))
        .catch(() => undefined);
      void loadKonsultasiSessions(l.server_id);
    }
  }, [uuid, loadKonsultasiSessions]);

  useIonViewWillEnter(() => { void reload(); });

  const pemupukan = useMemo(() => aktivitas.filter((a) => a.tipe === 'pemupukan'), [aktivitas]);
  const pestisida = useMemo(() => aktivitas.filter((a) => a.tipe === 'pestisida'), [aktivitas]);
  const lainnya = useMemo(() => aktivitas.filter((a) => a.tipe === 'semai' || a.tipe === 'pindah_tanam'), [aktivitas]);

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

  /** Centang item rencana perawatan → toggle + auto-tambah ke riwayat jika baru dicentang */
  const handleToggleCarePlanItem = async (idx: number, item: CarePlanScheduleItem): Promise<void> => {
    if (!carePlan) return;
    const wasCompleted = (carePlan.completed_items ?? []).includes(idx);
    try {
      const res = await api.put<{ data: { completed_items: number[] } }>(`/care-plans/${carePlan.id}/toggle`, { index: idx });
      setCarePlan({ ...carePlan, completed_items: res.data.data.completed_items });

      // Auto-tambah ke riwayat jika baru dicentang (bukan uncentang)
      if (!wasCompleted) {
        const isPestisida = item.aktivitas.toLowerCase().includes('pestisida') || item.aktivitas.toLowerCase().includes('semprot');
        const isPupuk = item.aktivitas.toLowerCase().includes('pupuk') || item.aktivitas.toLowerCase().includes('kocor') || item.aktivitas.toLowerCase().includes('benam') || !!item.kocor || !!item.benam;

        if (isPupuk) {
          const jenis = item.kocor || item.benam || item.detail || item.aktivitas;
          await aktivitasRepo.create({
            lahan_uuid: uuid,
            tipe: 'pemupukan',
            tanggal: new Date().toISOString().slice(0, 10),
            jenis_pupuk: jenis,
            jenis_pestisida: null,
            catatan: `Dari rencana perawatan: Minggu ${item.minggu}`,
          });
          await reload();
          await refreshCounts();
          if (navigator.onLine) void runSync();
          setToast('✅ Ditambahkan ke riwayat pemupukan');
        } else if (isPestisida) {
          const jenis = item.detail || item.aktivitas;
          await aktivitasRepo.create({
            lahan_uuid: uuid,
            tipe: 'pestisida',
            tanggal: new Date().toISOString().slice(0, 10),
            jenis_pupuk: null,
            jenis_pestisida: jenis,
            catatan: `Dari rencana perawatan: Minggu ${item.minggu}`,
          });
          await reload();
          await refreshCounts();
          if (navigator.onLine) void runSync();
          setToast('✅ Ditambahkan ke riwayat pestisida');
        }
      }
    } catch { /* silent */ }
  };

  const totalWeeks = useMemo(() => {
    if (!carePlan?.schedule?.length) return 0;
    return Math.max(...carePlan.schedule.map((s) => s.minggu));
  }, [carePlan]);

  const renderBahanItem = (
    a: AktivitasLocal,
    bahan: string[],
    icon: string,
    bg: string,
    fg: string,
  ): React.JSX.Element => (
    <IonItemSliding key={a.client_uuid}>
      <div className="kbn-card p-3.5 flex items-start gap-3 mb-3 overflow-hidden">
        <div className="kbn-avatar shrink-0" style={{ background: bg, color: fg }}>
          <IonIcon icon={icon} className="text-xl" />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex flex-wrap gap-1.5 max-w-full">
            {bahan.length > 0 ? (
              bahan.map((b) => (
                <span key={b} className="badge text-[11px] max-w-full" style={{ background: bg, color: fg, overflowWrap: 'break-word', wordBreak: 'break-word' }}>{b}</span>
              ))
            ) : (
              <span className="text-heading-md text-slate-dark">—</span>
            )}
          </div>
          <p className="text-caption text-slate-muted mt-1.5">
            {formatTanggal(a.tanggal)}
          </p>
          {a.catatan && (
            <p className="text-[11px] mt-1 text-slate-500 italic">{a.catatan}</p>
          )}
        </div>
      </div>
      <IonItemOptions side="end">
        <IonItemOption color="danger" onClick={() => setToDelete(a)}>
          <IonIcon slot="icon-only" icon={trashOutline} />
        </IonItemOption>
      </IonItemOptions>
    </IonItemSliding>
  );

  /** Section header with collapse toggle */
  const SectionHeader = ({ title, sectionKey, count, actionBtn }: { title: string; sectionKey: string; count?: number; actionBtn?: React.ReactNode }): React.JSX.Element => (
    <div className="flex items-center justify-between mb-2 px-1">
      <button type="button" onClick={() => toggle(sectionKey)} className="flex items-center gap-1.5">
        <h2 className="text-heading-md text-slate-dark">{title}</h2>
        {count !== undefined && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{count}</span>}
        <IonIcon icon={collapsed[sectionKey] ? chevronDown : chevronUp} className="text-slate-400 text-sm" />
      </button>
      {actionBtn}
    </div>
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
              <IonButton size="small" fill="outline" color="tertiary" onClick={() => {
                if (!lahan?.server_id) { setToast('Tanaman belum tersinkron ke server.'); return; }
                router.push(`/app/chat?keluhan=1&lahan_id=${lahan.server_id}`, 'forward', 'push');
              }}>
                <IonIcon slot="start" icon={chatbubbleEllipsesOutline} />
                Konsultasi
              </IonButton>
            </div>

            {/* Riwayat Konsultasi */}
            <div className="mb-5">
              <SectionHeader
                title="Riwayat Konsultasi"
                sectionKey="konsultasi"
                count={konsultasiSessions.length}
                actionBtn={
                  <button
                    type="button"
                    onClick={() => {
                      if (!lahan?.server_id) { setToast('Tanaman belum tersinkron ke server.'); return; }
                      router.push(`/app/chat?keluhan=1&lahan_id=${lahan.server_id}`, 'forward', 'push');
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg active:bg-emerald-100 touch-manipulation"
                  >
                    <IonIcon icon={chatbubbleEllipsesOutline} className="text-sm" />
                    + Baru
                  </button>
                }
              />

              {!collapsed.konsultasi && (
                <>
                  {loadingKonsultasi ? (
                    <div className="flex justify-center py-4"><IonSpinner name="crescent" color="primary" /></div>
                  ) : konsultasiSessions.length === 0 ? (
                    <div className="kbn-card p-5 text-center text-slate-muted">
                      <IonIcon icon={chatbubbleEllipsesOutline} className="text-3xl mb-2" />
                      <p className="text-body">Belum ada konsultasi untuk tanaman ini.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {konsultasiSessions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => router.push(`/app/chat?keluhan=1&lahan_id=${lahan?.server_id}&session_id=${s.id}`, 'forward', 'push')}
                          className="kbn-card p-3.5 w-full text-left active:bg-slate-50 touch-manipulation"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                              <IonIcon icon={chatbubbleEllipsesOutline} className="text-emerald-600 text-lg" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-slate-800 truncate">{s.judul}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(s.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                            <IonIcon icon={chatbubbleEllipsesOutline} className="text-slate-400 text-base mt-1" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
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
                      const isDone = (carePlan.completed_items ?? []).includes(idx);
                      const weekRange = getWeekRange(lahan.tanggal_tanam, item.minggu, totalWeeks);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => void handleToggleCarePlanItem(idx, item)}
                          className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-colors touch-manipulation ${isDone ? 'bg-green-50 border border-green-100' : 'bg-slate-50 border border-slate-100'}`}
                        >
                          <IonIcon
                            icon={isDone ? checkmarkCircle : ellipseOutline}
                            className={`text-lg mt-0.5 shrink-0 ${isDone ? 'text-green-600' : 'text-slate-300'}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className={`text-[12px] font-semibold ${isDone ? 'text-green-700 line-through' : 'text-slate-800'}`}>
                              Minggu {item.minggu}
                            </p>
                            {weekRange && (
                              <p className="text-[10px] text-indigo-600 font-medium mt-0.5">📅 {weekRange}</p>
                            )}
                            {/* Nama bahan (pupuk/pestisida) */}
                            <p className="text-[12px] text-slate-800 font-semibold mt-1" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                              {item.kocor ? `🫗 ${item.kocor}` : item.benam ? `🌱 ${item.benam}` : item.aktivitas}
                            </p>
                            {/* Penjelasan mengapa / detail */}
                            {item.detail && (
                              <p className="text-[11px] text-slate-500 mt-0.5">{item.detail}</p>
                            )}
                            {item.catatan && (
                              <p className="text-[10px] text-slate-400 mt-0.5 italic">{item.catatan}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
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
            <div className="mb-5">
              <SectionHeader title="Riwayat Pemupukan" sectionKey="pemupukan" count={pemupukan.length} />
              {!collapsed.pemupukan && (
                <>
                  {pemupukan.length === 0 ? (
                    <div className="kbn-card p-5 text-center text-slate-muted">
                      <IonIcon icon={flaskOutline} className="text-3xl mb-2" />
                      <p className="text-body">Belum ada pemupukan.</p>
                    </div>
                  ) : (
                    <div className="kbn-stagger">
                      {pemupukan.map((p) =>
                        renderBahanItem(p, splitBahan(p.jenis_pupuk), flaskOutline, '#E0F2FE', '#0369A1'),
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Riwayat Pestisida */}
            <div className="mb-5">
              <SectionHeader title="Riwayat Pestisida" sectionKey="pestisida" count={pestisida.length} />
              {!collapsed.pestisida && (
                <>
                  {pestisida.length === 0 ? (
                    <div className="kbn-card p-5 text-center text-slate-muted">
                      <IonIcon icon={bugOutline} className="text-3xl mb-2" />
                      <p className="text-body">Belum ada penyemprotan pestisida.</p>
                    </div>
                  ) : (
                    <div className="kbn-stagger">
                      {pestisida.map((p) =>
                        renderBahanItem(p, splitBahan(p.jenis_pestisida), bugOutline, '#FFE4E6', '#BE123C'),
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Aktivitas lain */}
            {lainnya.length > 0 && (
              <div className="mb-5">
                <SectionHeader title="Aktivitas Lain" sectionKey="lainnya" count={lainnya.length} />
                {!collapsed.lainnya && (
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
                )}
              </div>
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
      </IonContent>
    </IonPage>
  );
}
