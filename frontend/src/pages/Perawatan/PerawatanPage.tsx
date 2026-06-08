import { useState, useCallback, useMemo } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonChip,
  IonLabel,
  IonButton,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonIcon,
  IonText,
  useIonViewWillEnter,
} from '@ionic/react';
import { sparkles, leaf, bug, chevronDown, chevronUp, calendarOutline, layersOutline } from 'ionicons/icons';
import { api } from '../../api/client';
import { CommodityAvatar } from '../../components/CommodityAvatar';
import type { PerawatanLahan, SaranAiResponse, ApiCollection, ApiResource } from '../../types';

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

function urgencyColor(days: number): string {
  if (days > 21) return 'text-red-600 bg-red-50 border-red-100';
  if (days > 14) return 'text-amber-600 bg-amber-50 border-amber-100';
  return 'text-green-700 bg-green-50 border-green-100';
}

interface PerawatanGroup {
  key: string;
  nama: string;
  items: PerawatanLahan[];
}

export default function PerawatanPage(): React.JSX.Element {
  const [data, setData] = useState<PerawatanLahan[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState<number | null>(null);
  const [saranMap, setSaranMap] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [grouped, setGrouped] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<ApiCollection<PerawatanLahan>>('/perawatan');
      setData(res.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useIonViewWillEnter(() => {
    void fetchData();
  });

  const handleRefresh = async (e: CustomEvent): Promise<void> => {
    await fetchData();
    (e.detail as { complete: () => void }).complete();
  };

  const toggleExpand = (id: number): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleGroup = (key: string): void => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const mintaSaran = async (lahanId: number): Promise<void> => {
    setAiLoading(lahanId);
    try {
      const res = await api.post<ApiResource<SaranAiResponse>>('/perawatan/saran-ai', {
        lahan_id: lahanId,
      });
      setSaranMap((prev) => ({ ...prev, [lahanId]: res.data.data.saran }));
    } catch (err: unknown) {
      const msg = (err as { response?: { status?: number } })?.response?.status === 429
        ? 'Quota AI habis, coba lagi dalam beberapa saat.'
        : 'Gagal mendapatkan saran AI. Coba lagi nanti.';
      setSaranMap((prev) => ({ ...prev, [lahanId]: msg }));
    } finally {
      setAiLoading(null);
    }
  };

  const groups = useMemo<PerawatanGroup[]>(() => {
    const map = new Map<string, PerawatanGroup>();
    for (const item of data) {
      const key = item.komoditas.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) existing.items.push(item);
      else map.set(key, { key, nama: item.komoditas.trim(), items: [item] });
    }
    return [...map.values()];
  }, [data]);

  const renderCard = (item: PerawatanLahan): React.JSX.Element => {
    const isExpanded = expanded.has(item.lahan_id);
    const pupukDays = item.terakhir_dipupuk ? daysSince(item.terakhir_dipupuk.tanggal) : null;
    const pestDays = item.terakhir_dipestisida ? daysSince(item.terakhir_dipestisida.tanggal) : null;

    return (
      <div key={item.lahan_id} className="bg-white rounded-xl border border-slate-100 shadow-sm mb-3 overflow-hidden">
        {/* Header */}
        <button
          type="button"
          className="w-full flex items-center gap-3 p-3 text-left"
          onClick={() => toggleExpand(item.lahan_id)}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <IonIcon icon={leaf} className="text-emerald-600 text-xl" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{item.komoditas}</p>
            <p className="text-[11px] text-slate-500">Bed {item.nomor_bed}</p>
          </div>
          <IonChip
            className="text-[10px] h-5 m-0"
            color={item.status === 'aktif' ? 'success' : item.status === 'semai' ? 'warning' : 'medium'}
          >
            {item.status}
          </IonChip>
          <IonIcon icon={isExpanded ? chevronUp : chevronDown} className="text-slate-400 text-lg" />
        </button>

        {/* Quick info row */}
        <div className="flex gap-2 px-3 pb-3">
          <div className={`flex-1 rounded-lg border px-2.5 py-1.5 ${pupukDays !== null ? urgencyColor(pupukDays) : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
            <div className="flex items-center gap-1">
              <IonIcon icon={leaf} className="text-xs" />
              <span className="text-[10px] font-semibold">Pupuk</span>
            </div>
            <p className="text-[11px] mt-0.5 font-medium">
              {pupukDays !== null ? `${pupukDays} hari lalu` : 'Belum pernah'}
            </p>
          </div>
          <div className={`flex-1 rounded-lg border px-2.5 py-1.5 ${pestDays !== null ? urgencyColor(pestDays) : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
            <div className="flex items-center gap-1">
              <IonIcon icon={bug} className="text-xs" />
              <span className="text-[10px] font-semibold">Pestisida</span>
            </div>
            <p className="text-[11px] mt-0.5 font-medium">
              {pestDays !== null ? `${pestDays} hari lalu` : 'Belum pernah'}
            </p>
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="px-3 pb-3 border-t border-slate-50 pt-3">
            <div className="mb-3">
              <p className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                <IonIcon icon={leaf} className="text-green-600" /> Riwayat Pemupukan
              </p>
              {item.riwayat_pemupukan.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic pl-4">Belum ada data</p>
              ) : (
                <div className="space-y-1.5 pl-4">
                  {item.riwayat_pemupukan.slice(0, 5).map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      <IonIcon icon={calendarOutline} className="text-slate-400 text-xs" />
                      <span className="text-slate-600 font-medium w-20">{r.tanggal}</span>
                      <span className="text-slate-800">{r.jenis_pupuk || '-'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-3">
              <p className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                <IonIcon icon={bug} className="text-amber-600" /> Riwayat Pestisida
              </p>
              {item.riwayat_pestisida.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic pl-4">Belum ada data</p>
              ) : (
                <div className="space-y-1.5 pl-4">
                  {item.riwayat_pestisida.slice(0, 5).map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      <IonIcon icon={calendarOutline} className="text-slate-400 text-xs" />
                      <span className="text-slate-600 font-medium w-20">{r.tanggal}</span>
                      <span className="text-slate-800">{r.jenis_pestisida || '-'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <IonButton
              expand="block"
              fill="solid"
              size="small"
              color="primary"
              className="mt-1 text-xs"
              disabled={aiLoading === item.lahan_id}
              onClick={() => void mintaSaran(item.lahan_id)}
            >
              {aiLoading === item.lahan_id ? (
                <IonSpinner name="dots" className="w-4 h-4 mr-1" />
              ) : (
                <IonIcon icon={sparkles} slot="start" />
              )}
              <IonLabel>Minta Saran AI</IonLabel>
            </IonButton>

            {saranMap[item.lahan_id] && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <p className="text-[11px] font-semibold text-emerald-800 mb-1 flex items-center gap-1">
                  <IonIcon icon={sparkles} className="text-sm" /> Rekomendasi AI
                </p>
                <p className="text-[11px] text-slate-700 whitespace-pre-line leading-relaxed">
                  {saranMap[item.lahan_id]}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle className="font-semibold text-base">Perawatan</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={(e) => void handleRefresh(e)}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="px-4 pb-24 pt-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <IonSpinner name="crescent" color="primary" />
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <IonIcon icon={leaf} className="text-5xl text-slate-300 mb-2" />
              <IonText color="medium">
                <p className="text-sm">Belum ada data perawatan.</p>
                <p className="text-xs mt-1">Catat pemupukan atau pestisida dari halaman Aktivitas.</p>
              </IonText>
            </div>
          ) : (
            <>
              {/* Summary bar */}
              <div className="flex items-center gap-2 mb-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold text-slate-800">{data.length}</p>
                  <p className="text-[10px] text-slate-500">Tanaman</p>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold text-green-700">
                    {data.filter((d) => d.terakhir_dipupuk).length}
                  </p>
                  <p className="text-[10px] text-slate-500">Sudah Dipupuk</p>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold text-amber-600">
                    {data.filter((d) => d.terakhir_dipestisida).length}
                  </p>
                  <p className="text-[10px] text-slate-500">Sudah Semprot</p>
                </div>
              </div>

              {/* Toggle grouping */}
              <div className="flex items-center mb-3">
                <button
                  type="button"
                  onClick={() => setGrouped((g) => !g)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                    grouped ? 'border-emerald bg-emerald/10 text-emerald-deep' : 'border-slate-200 bg-white text-slate-dark'
                  }`}
                >
                  <IonIcon icon={layersOutline} className="text-sm" />
                  Kelompokkan
                </button>
                <span className="ml-auto text-[11px] text-slate-400 font-medium">{data.length} tanaman</span>
              </div>

              {/* List: grouped or flat */}
              {grouped ? (
                groups.map((g) => {
                  const isCollapsed = collapsedGroups.has(g.key);
                  return (
                    <div key={g.key} className="mb-4">
                      <button
                        type="button"
                        onClick={() => toggleGroup(g.key)}
                        className="flex items-center gap-2.5 px-1 mb-2 w-full text-left"
                      >
                        <CommodityAvatar komoditas={g.nama} className="!w-8 !h-8 !text-lg !rounded-xl" />
                        <div className="flex-1">
                          <span className="text-[0.88rem] font-bold text-slate-dark">{g.nama}</span>
                          <p className="text-[0.65rem] text-slate-muted">{g.items.length} bedengan</p>
                        </div>
                        <IonIcon icon={isCollapsed ? chevronDown : chevronUp} className="text-slate-muted text-lg" />
                      </button>
                      {!isCollapsed && g.items.map(renderCard)}
                    </div>
                  );
                })
              ) : (
                data.map(renderCard)
              )}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
