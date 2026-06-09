import { useState, useCallback } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonButtons,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  leaf,
  wallet,
  barChart,
  trendingUp,
  calendarOutline,
  ribbonOutline,
  settingsOutline,
  documentTextOutline,
  medkitOutline,
  rainy,
  sunny,
  cloudy,
  sparkles,
  navigateOutline,
  locationOutline,
  chevronDownOutline,
  chevronUpOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { api } from '../../api/client';
import { transaksiRepo } from '../../db/repository';
import { useLocationStore } from '../../store/locationStore';
import type { DashboardData, SaranHarianResponse, ApiResource } from '../../types';
import { AccountButton } from '../../components/AccountButton';
import { SyncIndicator } from '../../components/SyncIndicator';

const IDR = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

function getDefaultRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = now.toISOString().slice(0, 10);
  return { start, end };
}

export default function DashboardPage(): React.JSX.Element {
  const history = useHistory();
  const [data, setData] = useState<DashboardData | null>(null);
  const [saranData, setSaranData] = useState<SaranHarianResponse | null>(null);
  const [saranExpanded, setSaranExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saranLoading, setSaranLoading] = useState(false);
  // Date range filter
  const [dateStart, setDateStart] = useState(getDefaultRange().start);
  const [dateEnd, setDateEnd] = useState(getDefaultRange().end);
  // Local keuangan (synced with KeuanganPage)
  const [kasmasuk, setKasmasuk] = useState(0);
  const [kaskeluar, setKaskeluar] = useState(0);

  const location = useLocationStore((s) => s.location);

  const recalcKeuangan = useCallback(async (start: string, end: string) => {
    const transaksi = await transaksiRepo.list();
    const filtered = transaksi.filter((t) => t.tanggal >= start && t.tanggal <= end);
    setKasmasuk(filtered.filter((t) => t.tipe === 'kas_masuk').reduce((s, t) => s + Number(t.nominal), 0));
    setKaskeluar(filtered.filter((t) => t.tipe === 'kas_keluar').reduce((s, t) => s + Number(t.nominal), 0));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dashRes = await api.get<{ data: DashboardData }>('/dashboard').catch(() => null);
      if (dashRes) setData(dashRes.data.data);
      await recalcKeuangan(dateStart, dateEnd);
    } catch { /* ignore */ }
    setLoading(false);
  }, [dateStart, dateEnd, recalcKeuangan]);

  const fetchSaran = useCallback(async () => {
    if (!navigator.onLine) return;
    setSaranLoading(true);
    try {
      const res = await api.get<ApiResource<SaranHarianResponse>>('/saran-harian', {
        params: { lat: location.lat, lon: location.lon },
      });
      setSaranData(res.data.data);
    } catch { /* silent */ }
    setSaranLoading(false);
  }, [location.lat, location.lon]);

  useIonViewWillEnter(() => {
    void (async () => {
      await fetchData();
      await fetchSaran();
    })();
  });

  const handleRefresh = async (e: CustomEvent): Promise<void> => {
    await fetchData();
    await fetchSaran();
    (e.target as HTMLIonRefresherElement).complete();
  };

  const handleDateChange = (start: string, end: string): void => {
    setDateStart(start);
    setDateEnd(end);
    void recalcKeuangan(start, end);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle className="font-bold">🌱 Ringkasan Kebun</IonTitle>
          <IonButtons slot="end"><SyncIndicator /></IonButtons>
          <AccountButton />
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <IonSpinner name="crescent" color="primary" />
          </div>
        ) : (
          <div className="px-4 pb-24 pt-2 space-y-4">
            {/* ═══ CUACA HERO ═══ */}
            <div className="kbn-hero kbn-fade-up p-5">
              <div className="relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-white/70">
                      <IonIcon icon={location.label.includes('GPS') ? navigateOutline : locationOutline} className="text-sm" />
                      <span className="text-[0.7rem] font-semibold tracking-wide">{location.label}</span>
                    </div>
                    {saranData ? (
                      <>
                        <p className="text-[1.8rem] font-extrabold mt-1 leading-none">
                          {saranData.cuaca.suhu}°<span className="text-[1rem] font-semibold text-white/70">C</span>
                        </p>
                        <p className="text-[0.8rem] text-white/80 mt-0.5">{saranData.cuaca.deskripsi}</p>
                      </>
                    ) : saranLoading ? (
                      <div className="mt-2"><IonSpinner name="dots" className="w-5 h-5 text-white" /></div>
                    ) : (
                      <p className="text-[1.4rem] font-extrabold mt-1 leading-none">Kebun Saya</p>
                    )}
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                    <IonIcon
                      icon={saranData ? (saranData.cuaca.akan_hujan ? rainy : saranData.cuaca.kode_cuaca <= 1 ? sunny : cloudy) : leaf}
                      className="text-2xl text-white"
                    />
                  </div>
                </div>

                {saranData?.cuaca.akan_hujan && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-400/20 px-2.5 py-1 text-[0.7rem] font-semibold text-blue-50">
                    🌧 Kemungkinan hujan {saranData.cuaca.probabilitas_hujan}% hari ini
                  </div>
                )}
              </div>
            </div>

            {/* ═══ SARAN AI ═══ */}
            {(saranData || saranLoading) && (
              <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <IonIcon icon={sparkles} className="text-emerald-600 text-base" />
                  </div>
                  <p className="text-sm font-bold text-emerald-900 flex-1">Saran AI Hari Ini</p>
                  {saranData && (
                    <button type="button" onClick={() => setSaranExpanded((v) => !v)}>
                      <IonIcon icon={saranExpanded ? chevronUpOutline : chevronDownOutline} className="text-emerald-400 text-lg" />
                    </button>
                  )}
                </div>
                <div className="px-4 pb-4">
                  {saranLoading ? (
                    <div className="flex items-center gap-2 py-2">
                      <IonSpinner name="dots" className="w-4 h-4" color="primary" />
                      <span className="text-xs text-slate-500">Menganalisis cuaca & tanamanmu...</span>
                    </div>
                  ) : saranData ? (
                    <p className={`text-[12px] text-slate-700 whitespace-pre-line leading-relaxed ${saranExpanded ? '' : 'line-clamp-3'}`}>
                      {saranData.saran}
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            {/* ═══ METRIK UTAMA ═══ */}
            <div className="rounded-xl bg-white border border-slate-200 p-3">
              <p className="text-[0.75rem] font-semibold text-slate-500 mb-2">📅 Periode Keuangan</p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => handleDateChange(e.target.value, dateEnd)}
                  className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[0.8rem] text-slate-700 bg-slate-50"
                />
                <span className="text-[0.75rem] text-slate-400">—</span>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => handleDateChange(dateStart, e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[0.8rem] text-slate-700 bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetricCard icon={leaf} label="Lahan Aktif" value={String(data?.lahan_aktif ?? 0)} accent="emerald" />
              <MetricCard icon={barChart} label="Top Komoditas" value={data?.top_komoditas ?? '-'} sub={data?.top_komoditas_count ? `${data.top_komoditas_count} bed` : ''} accent="blue" />
              <MetricCard icon={wallet} label="Pengeluaran Bln Ini" value={IDR.format(kaskeluar)} accent="rose" />
              <MetricCard icon={trendingUp} label="Pendapatan Bln Ini" value={IDR.format(kasmasuk)} accent="emerald" />
            </div>

            {/* Laba Estimasi */}
            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <p className="text-caption text-slate-500">Saldo Bersih (Pemasukan - Pengeluaran)</p>
              <p className={`text-xl font-bold ${(kasmasuk - kaskeluar) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {IDR.format(kasmasuk - kaskeluar)}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-600">Aksi Cepat</p>
              <div className="grid grid-cols-2 gap-2">
                <QuickAction icon={ribbonOutline} label="Panen" onClick={() => history.push('/app/panen')} />
                <QuickAction icon={calendarOutline} label="Kalender" onClick={() => history.push('/app/kalender')} />
                <QuickAction icon={documentTextOutline} label="Aktivitas" onClick={() => history.push('/app/aktivitas')} />
                <QuickAction icon={medkitOutline} label="Perawatan" onClick={() => history.push('/app/perawatan')} />
                <QuickAction icon={settingsOutline} label="Pengaturan" onClick={() => history.push('/app/pengaturan')} />
              </div>
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}

function MetricCard({ icon, label, value, sub, accent }: { icon: string; label: string; value: string; sub?: string; accent: string }): React.JSX.Element {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <div className={`rounded-xl border p-3 ${colorMap[accent] ?? colorMap.emerald}`}>
      <IonIcon icon={icon} className="text-lg mb-1" />
      <p className="text-caption font-medium opacity-70">{label}</p>
      <p className="text-sm font-bold truncate">{value}</p>
      {sub && <p className="text-[11px] opacity-60">{sub}</p>}
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
    >
      <IonIcon icon={icon} className="text-base text-emerald-600" />
      {label}
    </button>
  );
}
