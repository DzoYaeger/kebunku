import { useState, useCallback, useMemo } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  timeOutline,
  leafOutline,
  swapHorizontalOutline,
  flaskOutline,
  bugOutline,
  cashOutline,
  cartOutline,
  calendarOutline,
  documentTextOutline,
  cloudUploadOutline,
} from 'ionicons/icons';
import type { AktivitasLocal, TransaksiLocal, LahanLocal } from '../../db';
import { aktivitasRepo, transaksiRepo, lahanRepo } from '../../db/repository';
import { hydrateFromServer } from '../../sync/hydrate';
import { useSyncStore } from '../../store/syncStore';
import { SyncIndicator } from '../../components/SyncIndicator';
import { AccountButton } from '../../components/AccountButton';
import { EmptyState } from '../../components/EmptyState';
import { CardSkeleton } from '../../components/CardSkeleton';
import { formatRupiah, formatTanggal } from '../../utils/format';

type Filter = 'semua' | 'tanaman' | 'keuangan';

interface TimelineItem {
  id: string;
  source: 'tanaman' | 'keuangan';
  tanggal: string;
  created_at: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeBg?: string;
  badgeColor?: string;
  dirty: boolean;
}

function buildTimeline(
  aktivitas: AktivitasLocal[],
  transaksi: TransaksiLocal[],
  lahanMap: Map<string, LahanLocal>,
): TimelineItem[] {
  const items: TimelineItem[] = [];

  const TIPE_META: Record<string, { icon: string; bg: string; fg: string; label: string }> = {
    semai: { icon: leafOutline, bg: '#FEF3C7', fg: '#B45309', label: 'Semai' },
    pindah_tanam: { icon: swapHorizontalOutline, bg: '#DCFCE7', fg: '#15803D', label: 'Pindah Tanam' },
    pemupukan: { icon: flaskOutline, bg: '#E0F2FE', fg: '#0369A1', label: 'Pemupukan' },
    pestisida: { icon: bugOutline, bg: '#FFE4E6', fg: '#BE123C', label: 'Pestisida' },
  };

  for (const a of aktivitas) {
    const meta = TIPE_META[a.tipe] ?? TIPE_META.semai;
    const lahan = lahanMap.get(a.lahan_uuid);
    const bahan = a.jenis_pupuk ?? a.jenis_pestisida;
    items.push({
      id: `a-${a.client_uuid}`,
      source: 'tanaman',
      tanggal: a.tanggal,
      created_at: a.created_at,
      icon: meta.icon,
      iconBg: meta.bg,
      iconColor: meta.fg,
      title: meta.label,
      subtitle: [lahan ? `${lahan.komoditas} · Bed ${lahan.nomor_bed}` : '', bahan, a.catatan]
        .filter(Boolean).join(' · '),
      badge: meta.label,
      badgeBg: meta.bg,
      badgeColor: meta.fg,
      dirty: a._dirty === 1,
    });
  }

  for (const t of transaksi) {
    const isMasuk = t.tipe === 'kas_masuk';
    items.push({
      id: `t-${t.client_uuid}`,
      source: 'keuangan',
      tanggal: t.tanggal,
      created_at: t.created_at,
      icon: isMasuk ? cashOutline : cartOutline,
      iconBg: isMasuk ? '#DCFCE7' : '#FFE4E6',
      iconColor: isMasuk ? '#15803D' : '#BE123C',
      title: isMasuk
        ? `Pemasukan · ${t.komoditas ?? t.kategori}`
        : `Pengeluaran · ${t.kategori}`,
      subtitle: [
        `${isMasuk ? '+' : '-'}${formatRupiah(t.nominal)}`,
        t.catatan,
      ].filter(Boolean).join(' · '),
      badge: isMasuk ? 'Kas Masuk' : 'Kas Keluar',
      badgeBg: isMasuk ? '#DCFCE7' : '#FFE4E6',
      badgeColor: isMasuk ? '#15803D' : '#BE123C',
      dirty: t._dirty === 1,
    });
  }

  items.sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.created_at.localeCompare(a.created_at));
  return items;
}

interface DateGroup {
  date: string;
  label: string;
  items: TimelineItem[];
}

function formatDateLabel(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Hari Ini';
  if (dateStr === yesterday) return 'Kemarin';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AktivitasListPage(): React.JSX.Element {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('semua');
  useSyncStore((s) => s.pendingCount); // re-render saat sync berubah

  const reload = useCallback(async (): Promise<void> => {
    const [aktivitas, transaksi, lahan] = await Promise.all([
      aktivitasRepo.list(),
      transaksiRepo.list(),
      lahanRepo.list(),
    ]);
    const lahanMap = new Map(lahan.map((l) => [l.client_uuid, l]));
    setTimeline(buildTimeline(aktivitas, transaksi, lahanMap));
  }, []);

  const sync = useCallback(async (): Promise<void> => {
    if (!navigator.onLine) return;
    try {
      await hydrateFromServer();
      await reload();
    } catch {/* data lokal */}
  }, [reload]);

  useIonViewWillEnter(() => {
    void (async (): Promise<void> => {
      await reload();
      setLoading(false);
    })();
  });

  const filtered = useMemo(() => {
    if (filter === 'semua') return timeline;
    return timeline.filter((t) => t.source === filter);
  }, [timeline, filter]);

  const dateGroups = useMemo<DateGroup[]>(() => {
    const map = new Map<string, TimelineItem[]>();
    for (const item of filtered) {
      const date = item.tanggal.slice(0, 10);
      const arr = map.get(date) ?? [];
      arr.push(item);
      map.set(date, arr);
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, items]) => ({ date, label: formatDateLabel(date), items }));
  }, [filtered]);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><AccountButton /></IonButtons>
          <IonTitle>Aktivitas</IonTitle>
          <IonButtons slot="end"><SyncIndicator /></IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={(e) => void sync().then(() => e.detail.complete())}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="px-4 pb-24 pt-2">
          {loading ? (
            <CardSkeleton count={6} />
          ) : (
            <>
              {/* Hero */}
              {timeline.length > 0 && (
                <div className="kbn-hero kbn-fade-up p-5 mb-5">
                  <div className="relative z-10">
                    <div className="flex items-center gap-1.5 text-white/70">
                      <IonIcon icon={timeOutline} className="text-base" />
                      <span className="text-[0.75rem] font-semibold tracking-wide uppercase">Riwayat</span>
                    </div>
                    <p className="text-[2rem] font-extrabold mt-1 leading-none">
                      {timeline.length} <span className="text-[1rem] font-semibold text-white/70">kegiatan</span>
                    </p>
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-3.5 border-t border-white/15">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                          <IonIcon icon={leafOutline} className="text-[#86efac] text-lg" />
                        </div>
                        <div>
                          <p className="text-[0.6rem] text-white/60 leading-none font-medium">Tanaman</p>
                          <p className="text-[0.9rem] font-bold mt-0.5">
                            {timeline.filter((t) => t.source === 'tanaman').length}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                          <IonIcon icon={cashOutline} className="text-[#fcd34d] text-lg" />
                        </div>
                        <div>
                          <p className="text-[0.6rem] text-white/60 leading-none font-medium">Keuangan</p>
                          <p className="text-[0.9rem] font-bold mt-0.5">
                            {timeline.filter((t) => t.source === 'keuangan').length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filter */}
              {timeline.length > 0 && (
                <div className="mb-4 kbn-fade-up" style={{ animationDelay: '0.06s' }}>
                  <IonSegment
                    className="kbn-segment"
                    value={filter}
                    onIonChange={(e) => setFilter((e.detail.value as Filter) ?? 'semua')}
                  >
                    <IonSegmentButton value="semua"><IonLabel>Semua</IonLabel></IonSegmentButton>
                    <IonSegmentButton value="tanaman"><IonLabel>Tanaman</IonLabel></IonSegmentButton>
                    <IonSegmentButton value="keuangan"><IonLabel>Keuangan</IonLabel></IonSegmentButton>
                  </IonSegment>
                </div>
              )}

              {/* Timeline */}
              {timeline.length === 0 ? (
                <EmptyState
                  icon={documentTextOutline}
                  title="Belum ada riwayat"
                  subtitle="Riwayat akan otomatis muncul saat Anda mencatat aktivitas di Tanaman atau Keuangan."
                />
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-body text-slate-muted">Tidak ada riwayat untuk kategori ini.</p>
                </div>
              ) : (
                <div className="kbn-fade-up" style={{ animationDelay: '0.1s' }}>
                  {dateGroups.map((group) => (
                    <div key={group.date} className="mb-5">
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                          <IonIcon icon={calendarOutline} className="text-slate-muted text-xs" />
                        </div>
                        <span className="text-[0.78rem] font-bold text-slate-dark">{group.label}</span>
                        <span className="text-[0.65rem] text-slate-muted">· {group.items.length}</span>
                        <div className="flex-1 h-px bg-slate-100 ml-2" />
                      </div>
                      <div className="pl-3 border-l-2 border-slate-100 ml-[11px] space-y-0">
                        {group.items.map((item) => (
                          <div key={item.id} className="relative flex items-start gap-3 mb-2.5 pl-3">
                            <div
                              className="absolute -left-[9px] top-4 w-4 h-4 rounded-full border-[3px] border-white shadow-sm z-10"
                              style={{ background: item.iconColor }}
                            />
                            <div className="kbn-card w-full p-3.5 flex items-center gap-3">
                              <div
                                className="kbn-avatar !w-10 !h-10 !rounded-xl"
                                style={{ background: item.iconBg, color: item.iconColor }}
                              >
                                <IonIcon icon={item.icon} className="text-lg" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[0.84rem] font-bold text-slate-dark truncate">
                                    {item.title}
                                  </span>
                                  {item.dirty && (
                                    <IonIcon icon={cloudUploadOutline} className="text-slate-muted text-[0.65rem] shrink-0" />
                                  )}
                                </div>
                                <p className="text-[0.7rem] text-slate-muted mt-0.5 truncate">
                                  {item.subtitle || formatTanggal(item.tanggal)}
                                </p>
                              </div>
                              {item.badge && (
                                <span
                                  className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                                  style={{ background: item.badgeBg, color: item.badgeColor }}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
