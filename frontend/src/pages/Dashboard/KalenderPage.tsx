import { useState, useCallback, useMemo } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSpinner,
  IonIcon,
  IonBackButton,
  IonButtons,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSearchbar,
  IonActionSheet,
  useIonViewWillEnter,
} from '@ionic/react';
import { leaf, bug, chevronDown, chevronUp, swapVerticalOutline } from 'ionicons/icons';
import { db } from '../../db';
import type { AktivitasLocal, LahanLocal } from '../../db';
import { CommodityAvatar } from '../../components/CommodityAvatar';
import { SyncIndicator } from '../../components/SyncIndicator';

interface ReminderItem {
  lahanUuid: string;
  nomorBed: string;
  komoditas: string;
  icon: string | null;
  type: 'pupuk' | 'pestisida';
  lastDate: string | null;
  daysSince: number | null;
  urgency: 'hijau' | 'kuning' | 'merah';
}

const PUPUK_INTERVAL = 14;
const PESTISIDA_INTERVAL = 21;

function daysBetween(d1: string, d2: string): number {
  return Math.floor((new Date(d2).getTime() - new Date(d1).getTime()) / 86400000);
}

function urgencyLevel(days: number | null, interval: number): 'hijau' | 'kuning' | 'merah' {
  if (days === null) return 'merah';
  if (days >= interval) return 'merah';
  if (days >= interval * 0.7) return 'kuning';
  return 'hijau';
}

const urgencyStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  merah: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Terlambat' },
  kuning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Segera' },
  hijau: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Aman' },
};

type GroupMode = 'jenis' | 'status';

export default function KalenderPage(): React.JSX.Element {
  const [items, setItems] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupMode, setGroupMode] = useState<GroupMode>('jenis');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['pupuk', 'pestisida', 'merah', 'kuning', 'hijau']));
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<'urgency' | 'date' | 'az'>('urgency');
  const [sortSheet, setSortSheet] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const lahanList: LahanLocal[] = await db.lahan.toArray();
    const aktivitasList: AktivitasLocal[] = await db.aktivitas.toArray();
    const aktiveLahan = lahanList.filter(l => l.status !== 'selesai');

    const reminders: ReminderItem[] = [];
    for (const lahan of aktiveLahan) {
      const akt = aktivitasList.filter(a => a.lahan_uuid === lahan.client_uuid);

      const lastPupuk = akt.filter(a => a.tipe === 'pemupukan').sort((a, b) => b.tanggal.localeCompare(a.tanggal))[0];
      const daysSincePupuk = lastPupuk ? daysBetween(lastPupuk.tanggal, today) : null;
      reminders.push({
        lahanUuid: lahan.client_uuid, nomorBed: lahan.nomor_bed, komoditas: lahan.komoditas,
        icon: lahan.icon, type: 'pupuk', lastDate: lastPupuk?.tanggal ?? null,
        daysSince: daysSincePupuk, urgency: urgencyLevel(daysSincePupuk, PUPUK_INTERVAL),
      });

      const lastPest = akt.filter(a => a.tipe === 'pestisida').sort((a, b) => b.tanggal.localeCompare(a.tanggal))[0];
      const daysSincePest = lastPest ? daysBetween(lastPest.tanggal, today) : null;
      reminders.push({
        lahanUuid: lahan.client_uuid, nomorBed: lahan.nomor_bed, komoditas: lahan.komoditas,
        icon: lahan.icon, type: 'pestisida', lastDate: lastPest?.tanggal ?? null,
        daysSince: daysSincePest, urgency: urgencyLevel(daysSincePest, PESTISIDA_INTERVAL),
      });
    }

    // Sort by urgency (terlambat first), then by daysSince desc
    const order = { merah: 0, kuning: 1, hijau: 2 };
    reminders.sort((a, b) => order[a.urgency] - order[b.urgency] || (b.daysSince ?? 999) - (a.daysSince ?? 999));

    setItems(reminders);
    setLoading(false);
  }, []);

  useIonViewWillEnter(() => { void fetchData(); });

  const toggleGroup = (key: string): void => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Grouped data
  const groups = useMemo(() => {
    // Filter by search
    let filtered = items;
    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((i) => i.komoditas.toLowerCase().includes(q) || i.nomorBed.toLowerCase().includes(q));
    }

    // Sort
    const sorted = [...filtered];
    if (sortMode === 'urgency') {
      const order = { merah: 0, kuning: 1, hijau: 2 };
      sorted.sort((a, b) => order[a.urgency] - order[b.urgency] || (b.daysSince ?? 999) - (a.daysSince ?? 999));
    } else if (sortMode === 'date') {
      sorted.sort((a, b) => (a.lastDate ?? '0').localeCompare(b.lastDate ?? '0'));
    } else {
      sorted.sort((a, b) => a.komoditas.localeCompare(b.komoditas, 'id'));
    }

    // Group
    const map = new Map<string, { label: string; items: ReminderItem[] }>();
    if (groupMode === 'jenis') {
      for (const item of sorted) {
        const key = item.type;
        const existing = map.get(key);
        if (existing) existing.items.push(item);
        else map.set(key, { label: key === 'pupuk' ? '💧 Pemupukan' : '🛡️ Pestisida', items: [item] });
      }
    } else {
      for (const item of sorted) {
        const key = item.urgency;
        const existing = map.get(key);
        if (existing) existing.items.push(item);
        else map.set(key, { label: urgencyStyles[key].label, items: [item] });
      }
    }
    return [...map.entries()].map(([key, val]) => ({ key, ...val }));
  }, [items, groupMode, search, sortMode]);

  const stats = useMemo(() => ({
    merah: items.filter(i => i.urgency === 'merah').length,
    kuning: items.filter(i => i.urgency === 'kuning').length,
    hijau: items.filter(i => i.urgency === 'hijau').length,
  }), [items]);

  const renderCard = (item: ReminderItem, idx: number): React.JSX.Element => {
    const style = urgencyStyles[item.urgency];
    return (
      <div key={`${item.lahanUuid}-${item.type}-${idx}`}
        className={`flex items-center gap-3 rounded-xl border ${style.border} bg-white p-3 mb-2`}
      >
        <CommodityAvatar komoditas={item.komoditas} icon={item.icon} className="!w-10 !h-10 !text-xl !rounded-xl" />
        <div className="flex-1 min-w-0">
          <p className="text-[0.82rem] font-semibold text-slate-800 truncate">
            {item.komoditas} <span className="text-slate-400 font-normal">· Bed {item.nomorBed}</span>
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <IonIcon icon={item.type === 'pupuk' ? leaf : bug} className={`text-xs ${item.type === 'pupuk' ? 'text-green-500' : 'text-amber-500'}`} />
            <span className="text-[11px] text-slate-500">
              {item.type === 'pupuk' ? 'Pupuk' : 'Pestisida'}
              {item.lastDate
                ? ` · ${item.lastDate} (${item.daysSince} hari lalu)`
                : ' · belum pernah'}
            </span>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${style.bg} ${style.text}`}>
          {style.label}
        </span>
      </div>
    );
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/app/dashboard" text="" />
          </IonButtons>
          <IonTitle>Kalender Perawatan</IonTitle>
          <IonButtons slot="end"><SyncIndicator /></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <IonSpinner name="crescent" color="primary" />
          </div>
        ) : (
          <div className="px-4 pb-24 pt-2">
            {/* Summary badges */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-center">
                <p className="text-lg font-bold text-rose-700">{stats.merah}</p>
                <p className="text-[10px] text-rose-600 font-medium">Terlambat</p>
              </div>
              <div className="flex-1 rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-center">
                <p className="text-lg font-bold text-amber-700">{stats.kuning}</p>
                <p className="text-[10px] text-amber-600 font-medium">Segera</p>
              </div>
              <div className="flex-1 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-center">
                <p className="text-lg font-bold text-emerald-700">{stats.hijau}</p>
                <p className="text-[10px] text-emerald-600 font-medium">Aman</p>
              </div>
            </div>

            {/* Grouping toggle */}
            <IonSegment
              className="kbn-segment mb-3"
              value={groupMode}
              onIonChange={(e) => setGroupMode(e.detail.value as GroupMode)}
            >
              <IonSegmentButton value="jenis"><IonLabel>Per Jenis</IonLabel></IonSegmentButton>
              <IonSegmentButton value="status"><IonLabel>Per Status</IonLabel></IonSegmentButton>
            </IonSegment>

            {/* Search + Sort */}
            <IonSearchbar
              className="kbn-search"
              placeholder="Cari komoditas / bed"
              value={search}
              onIonInput={(e) => setSearch(e.detail.value ?? '')}
              debounce={150}
            />
            <div className="flex items-center gap-2 mb-3">
              <button type="button" onClick={() => setSortSheet(true)} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700">
                <IonIcon icon={swapVerticalOutline} className="text-sm" />
                {sortMode === 'urgency' ? 'Urgensi' : sortMode === 'date' ? 'Tanggal' : 'A-Z'}
              </button>
              <span className="ml-auto text-[11px] text-slate-400">{items.length} pengingat</span>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400 text-sm">Belum ada tanaman aktif.</p>
                <p className="text-slate-400 text-xs mt-1">Tambahkan tanaman di tab Tanaman.</p>
              </div>
            ) : (
              <div>
                {groups.map((g) => {
                  const isCollapsed = collapsed.has(g.key);
                  return (
                    <div key={g.key} className="mb-4">
                      <button
                        type="button"
                        onClick={() => toggleGroup(g.key)}
                        className="flex items-center gap-2 w-full px-1 mb-2"
                      >
                        <span className="text-sm font-bold text-slate-700">{g.label}</span>
                        <span className="text-[11px] text-slate-400 font-medium">({g.items.length})</span>
                        <IonIcon icon={isCollapsed ? chevronDown : chevronUp} className="ml-auto text-slate-400" />
                      </button>
                      {!isCollapsed && g.items.map(renderCard)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </IonContent>
      <IonActionSheet
        isOpen={sortSheet}
        onDidDismiss={() => setSortSheet(false)}
        header="Urutkan"
        buttons={[
          { text: 'Urgensi (terlambat dulu)', handler: () => setSortMode('urgency') },
          { text: 'Tanggal terakhir', handler: () => setSortMode('date') },
          { text: 'Nama A → Z', handler: () => setSortMode('az') },
          { text: 'Batal', role: 'cancel' },
        ]}
      />
    </IonPage>
  );
}
