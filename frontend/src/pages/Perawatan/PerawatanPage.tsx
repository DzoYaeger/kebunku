import { useState, useCallback, useMemo } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonChip,
  IonLabel,
  IonButton,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonIcon,
  IonText,
  IonModal,
  IonSearchbar,
  IonActionSheet,
  IonTextarea,
  IonToast,
  useIonViewWillEnter,
} from '@ionic/react';
import { sparkles, leaf, bug, chevronDown, chevronUp, calendarOutline, layersOutline, timeOutline, refreshOutline, swapVerticalOutline, alertCircleOutline, cameraOutline, clipboardOutline } from 'ionicons/icons';
import { api } from '../../api/client';
import { db } from '../../db';
import { aktivitasRepo } from '../../db/repository';
import { runSync } from '../../sync/SyncEngine';
import { CommodityAvatar } from '../../components/CommodityAvatar';
import { SyncIndicator } from '../../components/SyncIndicator';
import { useHistory } from 'react-router-dom';
import type { PerawatanLahan, SaranAiResponse, ApiCollection, ApiResource } from '../../types';

interface SaranRiwayat {
  id: number;
  saran: string;
  created_at: string;
}

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

function urgencyColor(days: number): string {
  if (days > 21) return 'text-red-600 bg-red-50 border-red-100';
  if (days > 14) return 'text-amber-600 bg-amber-50 border-amber-100';
  return 'text-green-700 bg-green-50 border-green-100';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface PerawatanGroup {
  key: string;
  nama: string;
  items: PerawatanLahan[];
}

export default function PerawatanPage(): React.JSX.Element {
  const history = useHistory();
  const [data, setData] = useState<PerawatanLahan[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState<number | null>(null);
  const [saranMap, setSaranMap] = useState<Record<number, SaranRiwayat[]>>({});
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [grouped, setGrouped] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [riwayatModal, setRiwayatModal] = useState<{ lahanId: number; komoditas: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'urgency' | 'recent' | 'az'>('urgency');
  const [sortSheet, setSortSheet] = useState(false);
  // Keluhan state
  const [keluhanModal, setKeluhanModal] = useState<{ lahanId: number; komoditas: string } | null>(null);
  const [keluhanText, setKeluhanText] = useState('');
  const [keluhanImage, setKeluhanImage] = useState<File | null>(null);
  const [keluhanImagePreview, setKeluhanImagePreview] = useState<string | null>(null);
  const [keluhanLoading, setKeluhanLoading] = useState(false);
  const [keluhanResult, setKeluhanResult] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<ApiCollection<PerawatanLahan>>('/perawatan');
      const items = res.data.data;
      setData(items);
      // Default: semua grup collapsed
      const keys = new Set(items.map((i) => i.komoditas.trim().toLowerCase()));
      setCollapsedGroups(keys);
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
    // Fetch riwayat saran saat expand (kalau belum ada)
    if (!expanded.has(id) && !saranMap[id]) {
      void fetchRiwayatSaran(id);
    }
  };

  const toggleGroup = (key: string): void => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const fetchRiwayatSaran = async (lahanId: number): Promise<void> => {
    try {
      const res = await api.get<{ data: SaranRiwayat[] }>(`/perawatan/saran-ai/${lahanId}`);
      setSaranMap((prev) => ({ ...prev, [lahanId]: res.data.data }));
    } catch { /* silent */ }
  };

  const generateSaran = async (lahanId: number): Promise<void> => {
    setAiLoading(lahanId);
    try {
      const res = await api.post<ApiResource<SaranAiResponse & { id: number; created_at: string }>>('/perawatan/saran-ai', {
        lahan_id: lahanId,
      });
      const resData = res.data.data;
      const newItem: SaranRiwayat = {
        id: resData.id,
        saran: resData.saran,
        created_at: resData.created_at,
      };
      setSaranMap((prev) => ({
        ...prev,
        [lahanId]: [newItem, ...(prev[lahanId] ?? [])],
      }));

      // Auto-create aktivitas entries for kalender reminder
      const lahan = await db.lahan.where('server_id').equals(lahanId).first();
      if (lahan) {
        const created: string[] = [];
        if (resData.jadwal_pupuk?.tanggal) {
          await aktivitasRepo.create({
            lahan_uuid: lahan.client_uuid,
            tipe: 'pemupukan',
            tanggal: resData.jadwal_pupuk.tanggal,
            jenis_pupuk: resData.jadwal_pupuk.jenis || null,
            catatan: '📅 Jadwal dari saran AI',
          });
          created.push('pupuk ' + resData.jadwal_pupuk.tanggal);
        }
        if (resData.jadwal_pestisida?.tanggal) {
          await aktivitasRepo.create({
            lahan_uuid: lahan.client_uuid,
            tipe: 'pestisida',
            tanggal: resData.jadwal_pestisida.tanggal,
            jenis_pestisida: resData.jadwal_pestisida.jenis || null,
            catatan: '📅 Jadwal dari saran AI',
          });
          created.push('pestisida ' + resData.jadwal_pestisida.tanggal);
        }
        if (created.length > 0) {
          setToast(`✅ Jadwal ditambahkan ke kalender: ${created.join(', ')}`);
          if (navigator.onLine) void runSync();
        }
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { status?: number } })?.response?.status === 429
        ? 'Quota AI habis, coba lagi dalam beberapa saat.'
        : 'Gagal mendapatkan saran AI. Coba lagi nanti.';
      const errorItem: SaranRiwayat = { id: Date.now(), saran: msg, created_at: new Date().toISOString() };
      setSaranMap((prev) => ({
        ...prev,
        [lahanId]: [errorItem, ...(prev[lahanId] ?? [])],
      }));
    } finally {
      setAiLoading(null);
    }
  };

  const submitKeluhan = async (): Promise<void> => {
    if (!keluhanModal || (!keluhanText.trim() && !keluhanImage)) return;
    setKeluhanLoading(true);
    try {
      const formData = new FormData();
      formData.append('lahan_id', String(keluhanModal.lahanId));
      if (keluhanText.trim()) formData.append('keluhan', keluhanText.trim());
      if (keluhanImage) formData.append('image', keluhanImage);

      const res = await api.post<ApiResource<{ solusi: string }>>('/perawatan/keluhan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setKeluhanResult(res.data.data.solusi);
    } catch {
      setKeluhanResult('Gagal mendapatkan solusi. Coba lagi nanti.');
    } finally {
      setKeluhanLoading(false);
    }
  };

  const handleKeluhanImage = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    setKeluhanImage(file);
    setKeluhanImagePreview(URL.createObjectURL(file));
  };

  // Filtered + sorted data
  const filteredData = useMemo(() => {
    let result = data;
    // Search
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((i) => i.komoditas.toLowerCase().includes(q) || i.nomor_bed.toLowerCase().includes(q));
    }
    // Sort
    const copy = [...result];
    if (sortMode === 'urgency') {
      copy.sort((a, b) => {
        const aDays = a.terakhir_dipupuk ? daysSince(a.terakhir_dipupuk.tanggal) : 999;
        const bDays = b.terakhir_dipupuk ? daysSince(b.terakhir_dipupuk.tanggal) : 999;
        return bDays - aDays;
      });
    } else if (sortMode === 'recent') {
      copy.sort((a, b) => {
        const aDate = a.terakhir_dipupuk?.tanggal ?? '0';
        const bDate = b.terakhir_dipupuk?.tanggal ?? '0';
        return bDate.localeCompare(aDate);
      });
    } else {
      copy.sort((a, b) => a.komoditas.localeCompare(b.komoditas, 'id'));
    }
    return copy;
  }, [data, searchQuery, sortMode]);

  const groups = useMemo<PerawatanGroup[]>(() => {
    const map = new Map<string, PerawatanGroup>();
    for (const item of filteredData) {
      const key = item.komoditas.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) existing.items.push(item);
      else map.set(key, { key, nama: item.komoditas.trim(), items: [item] });
    }
    return [...map.values()];
  }, [filteredData]);

  const renderCard = (item: PerawatanLahan): React.JSX.Element => {
    const isExpanded = expanded.has(item.lahan_id);
    const pupukDays = item.terakhir_dipupuk ? daysSince(item.terakhir_dipupuk.tanggal) : null;
    const pestDays = item.terakhir_dipestisida ? daysSince(item.terakhir_dipestisida.tanggal) : null;
    const riwayat = saranMap[item.lahan_id] ?? [];
    const hasSaran = riwayat.length > 0;
    const latestSaran = riwayat[0];

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

            {/* Saran AI Section */}
            {hasSaran ? (
              <div className="mt-2">
                {/* Saran terbaru */}
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg mb-2">
                  <p className="text-[11px] font-semibold text-emerald-800 mb-1 flex items-center gap-1">
                    <IonIcon icon={sparkles} className="text-sm" /> Saran AI Terbaru
                    <span className="ml-auto text-[10px] font-normal text-emerald-600">{formatDate(latestSaran.created_at)}</span>
                  </p>
                  <p className="text-[11px] text-slate-700 whitespace-pre-line leading-relaxed">
                    {latestSaran.saran}
                  </p>
                </div>
                {/* Action buttons */}
                <div className="flex gap-2">
                  <IonButton
                    fill="outline"
                    size="small"
                    className="flex-1 text-xs"
                    onClick={() => setRiwayatModal({ lahanId: item.lahan_id, komoditas: item.komoditas })}
                  >
                    <IonIcon icon={timeOutline} slot="start" />
                    <IonLabel>Riwayat ({riwayat.length})</IonLabel>
                  </IonButton>
                  <IonButton
                    fill="solid"
                    size="small"
                    color="primary"
                    className="flex-1 text-xs"
                    disabled={aiLoading === item.lahan_id}
                    onClick={() => void generateSaran(item.lahan_id)}
                  >
                    {aiLoading === item.lahan_id ? (
                      <IonSpinner name="dots" className="w-4 h-4 mr-1" />
                    ) : (
                      <IonIcon icon={refreshOutline} slot="start" />
                    )}
                    <IonLabel>Generate Baru</IonLabel>
                  </IonButton>
                </div>
                {/* Lapor Keluhan */}
                <IonButton
                  expand="block"
                  fill="outline"
                  size="small"
                  color="warning"
                  className="mt-2 text-xs"
                  onClick={() => { setKeluhanModal({ lahanId: item.lahan_id, komoditas: item.komoditas }); setKeluhanText(''); setKeluhanResult(null); setKeluhanImage(null); setKeluhanImagePreview(null); }}
                >
                  <IonIcon icon={alertCircleOutline} slot="start" />
                  <IonLabel>Lapor Keluhan / Penyakit</IonLabel>
                </IonButton>
                {/* Rencana Perawatan AI */}
                <IonButton
                  expand="block"
                  fill="outline"
                  size="small"
                  color="tertiary"
                  className="mt-2 text-xs"
                  onClick={() => history.push(`/app/perawatan/care-plan/${item.lahan_id}`)}
                >
                  <IonIcon icon={clipboardOutline} slot="start" />
                  <IonLabel>Rencana & Feedback</IonLabel>
                </IonButton>
              </div>
            ) : (
              <div className="mt-1 space-y-2">
                <IonButton
                  expand="block"
                  fill="solid"
                  size="small"
                  color="primary"
                  className="text-xs"
                  disabled={aiLoading === item.lahan_id}
                  onClick={() => void generateSaran(item.lahan_id)}
                >
                  {aiLoading === item.lahan_id ? (
                    <IonSpinner name="dots" className="w-4 h-4 mr-1" />
                  ) : (
                    <IonIcon icon={sparkles} slot="start" />
                  )}
                  <IonLabel>Minta Saran AI</IonLabel>
                </IonButton>
                <IonButton
                  expand="block"
                  fill="outline"
                  size="small"
                  color="warning"
                  className="text-xs"
                  onClick={() => { setKeluhanModal({ lahanId: item.lahan_id, komoditas: item.komoditas }); setKeluhanText(''); setKeluhanResult(null); setKeluhanImage(null); setKeluhanImagePreview(null); }}
                >
                  <IonIcon icon={alertCircleOutline} slot="start" />
                  <IonLabel>Lapor Keluhan / Penyakit</IonLabel>
                </IonButton>
                <IonButton
                  expand="block"
                  fill="outline"
                  size="small"
                  color="tertiary"
                  className="text-xs"
                  onClick={() => history.push(`/app/perawatan/care-plan/${item.lahan_id}`)}
                >
                  <IonIcon icon={clipboardOutline} slot="start" />
                  <IonLabel>Rencana & Feedback</IonLabel>
                </IonButton>
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
          <IonTitle className="font-semibold text-base">Pemeliharaan</IonTitle>
          <IonButtons slot="end"><SyncIndicator /></IonButtons>
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

              {/* Search */}
              <IonSearchbar
                className="kbn-search"
                placeholder="Cari komoditas atau bed..."
                value={searchQuery}
                onIonInput={(e) => setSearchQuery(e.detail.value ?? '')}
                debounce={200}
              />

              {/* Toggle grouping & Sort */}
              <div className="flex items-center gap-2 mb-3">
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
                <button
                  type="button"
                  onClick={() => setSortSheet(true)}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-dark"
                >
                  <IonIcon icon={swapVerticalOutline} className="text-sm" />
                  {sortMode === 'urgency' ? 'Urgensi' : sortMode === 'recent' ? 'Terbaru' : 'A-Z'}
                </button>
                <span className="ml-auto text-[11px] text-slate-400 font-medium">{filteredData.length} tanaman</span>
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
                filteredData.map(renderCard)
              )}
            </>
          )}
        </div>
      </IonContent>

      {/* Modal Riwayat Saran AI */}
      <IonModal
        isOpen={riwayatModal !== null}
        onDidDismiss={() => setRiwayatModal(null)}
        initialBreakpoint={0.75}
        breakpoints={[0, 0.5, 0.75, 1]}
      >
        <IonContent className="ion-padding">
          <p className="text-sm font-bold text-slate-800 mb-1">
            Riwayat Saran AI
          </p>
          <p className="text-[11px] text-slate-500 mb-4">{riwayatModal?.komoditas}</p>
          {riwayatModal && (saranMap[riwayatModal.lahanId] ?? []).length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-6">Belum ada riwayat saran.</p>
          ) : (
            <div className="space-y-3">
              {riwayatModal && (saranMap[riwayatModal.lahanId] ?? []).map((item, idx) => (
                <div key={item.id} className={`p-3 rounded-lg border ${idx === 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
                  <p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                    <IonIcon icon={calendarOutline} className="text-xs" />
                    {formatDate(item.created_at)}
                    {idx === 0 && <span className="ml-1 text-emerald-700 font-semibold">Terbaru</span>}
                  </p>
                  <p className="text-[11px] text-slate-700 whitespace-pre-line leading-relaxed">{item.saran}</p>
                </div>
              ))}
            </div>
          )}
        </IonContent>
      </IonModal>
      {/* Sort ActionSheet */}
      <IonActionSheet
        isOpen={sortSheet}
        onDidDismiss={() => setSortSheet(false)}
        header="Urutkan"
        buttons={[
          { text: 'Urgensi (belum lama dipupuk)', handler: () => setSortMode('urgency') },
          { text: 'Terbaru dipupuk', handler: () => setSortMode('recent') },
          { text: 'A → Z', handler: () => setSortMode('az') },
          { text: 'Batal', role: 'cancel' },
        ]}
      />

      {/* Modal Keluhan / Penyakit */}
      <IonModal
        isOpen={keluhanModal !== null}
        onDidDismiss={() => { setKeluhanModal(null); setKeluhanResult(null); setKeluhanImage(null); setKeluhanImagePreview(null); }}
        initialBreakpoint={0.85}
        breakpoints={[0, 0.85, 1]}
      >
        <IonContent className="ion-padding">
          <p className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
            <IonIcon icon={alertCircleOutline} className="text-amber-600" />
            Lapor Keluhan / Penyakit
          </p>
          <p className="text-[11px] text-slate-500 mb-3">{keluhanModal?.komoditas}</p>

          {!keluhanResult ? (
            <>
              <IonTextarea
                placeholder="Jelaskan keluhan atau gejala penyakit yang terlihat... (misal: daun menguning, ada bercak coklat, batang membusuk)"
                value={keluhanText}
                onIonInput={(e) => setKeluhanText(e.detail.value ?? '')}
                rows={3}
                className="border border-slate-200 rounded-lg text-sm"
              />

              {/* Image upload */}
              <div className="mt-3">
                <label className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 p-3 cursor-pointer hover:bg-slate-50 transition-colors">
                  <IonIcon icon={cameraOutline} className="text-xl text-slate-500" />
                  <span className="text-[12px] text-slate-600 font-medium">
                    {keluhanImage ? 'Ganti foto' : 'Ambil / Upload foto tanaman'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleKeluhanImage}
                    className="hidden"
                  />
                </label>
                {keluhanImagePreview && (
                  <div className="mt-2 relative">
                    <img src={keluhanImagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg border border-slate-200" />
                    <button
                      type="button"
                      onClick={() => { setKeluhanImage(null); setKeluhanImagePreview(null); }}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                    >✕</button>
                  </div>
                )}
              </div>

              <IonButton
                expand="block"
                color="primary"
                className="mt-3"
                disabled={keluhanLoading || (!keluhanText.trim() && !keluhanImage)}
                onClick={() => void submitKeluhan()}
              >
                {keluhanLoading ? (
                  <IonSpinner name="dots" className="w-4 h-4 mr-2" />
                ) : (
                  <IonIcon icon={sparkles} slot="start" />
                )}
                <IonLabel>{keluhanLoading ? 'Menganalisis...' : keluhanImage ? 'Analisis Foto + AI' : 'Minta Solusi AI'}</IonLabel>
              </IonButton>
            </>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-[11px] font-semibold text-amber-800 mb-1">Keluhan:</p>
              <p className="text-[11px] text-slate-600 mb-2 italic">{keluhanText || '[Foto tanaman]'}</p>
              {keluhanImagePreview && (
                <img src={keluhanImagePreview} alt="Foto keluhan" className="w-full h-32 object-cover rounded-lg mb-3 border" />
              )}
              <p className="text-[11px] font-semibold text-emerald-800 mb-1 flex items-center gap-1">
                <IonIcon icon={sparkles} className="text-sm" /> Solusi AI:
              </p>
              <p className="text-[11px] text-slate-700 whitespace-pre-line leading-relaxed">{keluhanResult}</p>
              <IonButton
                expand="block"
                fill="outline"
                size="small"
                className="mt-3"
                onClick={() => { setKeluhanResult(null); setKeluhanText(''); setKeluhanImage(null); setKeluhanImagePreview(null); }}
              >
                Lapor Keluhan Lain
              </IonButton>
            </div>
          )}
        </IonContent>
      </IonModal>

      <IonToast
        isOpen={toast !== null}
        message={toast ?? ''}
        duration={3000}
        onDidDismiss={() => setToast(null)}
        color="success"
      />
    </IonPage>
  );
}
