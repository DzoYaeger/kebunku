import { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
} from '@ionic/react';
import { checkmarkCircle, leaf, bug, closeCircle } from 'ionicons/icons';
import type { LahanLocal } from '../../db';
import { db } from '../../db';
import { aktivitasRepo } from '../../db/repository';
import { runSync } from '../../sync/SyncEngine';
import { CommodityAvatar } from '../../components/CommodityAvatar';

interface Props {
  isOpen: boolean;
  lahanList: LahanLocal[];
  onClose: () => void;
  onDone: (count: number) => void;
}

type Tipe = 'pemupukan' | 'pestisida';

export function BulkPerawatanModal({ isOpen, lahanList, onClose, onDone }: Props): React.JSX.Element {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tipe, setTipe] = useState<Tipe>('pemupukan');
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [jenisItems, setJenisItems] = useState<string[]>([]);
  const [jenisInput, setJenisInput] = useState('');
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);
  // History suggestions from previous inputs
  const [pupukHistory, setPupukHistory] = useState<string[]>([]);
  const [pestisidaHistory, setPestisidaHistory] = useState<string[]>([]);

  // Load history when modal opens
  useEffect(() => {
    if (!isOpen) return;
    void (async () => {
      const allAkt = await db.aktivitas.toArray();
      const pupukSet = new Set<string>();
      const pestSet = new Set<string>();
      for (const a of allAkt) {
        if (a.jenis_pupuk) a.jenis_pupuk.split(',').forEach((j) => pupukSet.add(j.trim()));
        if (a.jenis_pestisida) a.jenis_pestisida.split(',').forEach((j) => pestSet.add(j.trim()));
      }
      setPupukHistory([...pupukSet].filter(Boolean).sort());
      setPestisidaHistory([...pestSet].filter(Boolean).sort());
    })();
  }, [isOpen]);

  const suggestions = tipe === 'pemupukan' ? pupukHistory : pestisidaHistory;
  const filteredSuggestions = suggestions.filter(
    (s) => !jenisItems.includes(s) && (jenisInput ? s.toLowerCase().includes(jenisInput.toLowerCase()) : true)
  );

  const addJenis = (val: string): void => {
    const trimmed = val.trim();
    if (trimmed && !jenisItems.includes(trimmed)) {
      setJenisItems((prev) => [...prev, trimmed]);
    }
    setJenisInput('');
  };

  const removeJenis = (val: string): void => {
    setJenisItems((prev) => prev.filter((j) => j !== val));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addJenis(jenisInput);
    }
  };

  const toggle = (uuid: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid); else next.add(uuid);
      return next;
    });
  };

  const selectAll = (): void => {
    if (selected.size === lahanList.length) setSelected(new Set());
    else setSelected(new Set(lahanList.map((l) => l.client_uuid)));
  };

  const handleSave = async (): Promise<void> => {
    if (selected.size === 0) return;
    setSaving(true);
    const jenisStr = jenisItems.join(', ') || null;
    for (const uuid of selected) {
      await aktivitasRepo.create({
        lahan_uuid: uuid,
        tipe,
        tanggal,
        jenis_pupuk: tipe === 'pemupukan' ? jenisStr : null,
        jenis_pestisida: tipe === 'pestisida' ? jenisStr : null,
        catatan: catatan || null,
      });
    }
    if (navigator.onLine) void runSync();
    setSaving(false);
    const count = selected.size;
    setSelected(new Set());
    setJenisItems([]);
    setJenisInput('');
    setCatatan('');
    onDone(count);
  };

  const reset = (): void => {
    setSelected(new Set());
    setJenisItems([]);
    setJenisInput('');
    setCatatan('');
    onClose();
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={reset}>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={reset}>Batal</IonButton>
          </IonButtons>
          <IonTitle className="text-sm font-bold">Perawatan Bulk</IonTitle>
          <IonButtons slot="end">
            <IonButton strong disabled={selected.size === 0 || saving} onClick={() => void handleSave()}>
              {saving ? <IonSpinner name="dots" className="w-4 h-4" /> : `Simpan (${selected.size})`}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* Tipe */}
        <IonSegment className="kbn-segment mb-4" value={tipe} onIonChange={(e) => { setTipe(e.detail.value as Tipe); setJenisItems([]); setJenisInput(''); }}>
          <IonSegmentButton value="pemupukan">
            <IonIcon icon={leaf} className="text-sm mr-1" />
            <IonLabel>Pupuk</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="pestisida">
            <IonIcon icon={bug} className="text-sm mr-1" />
            <IonLabel>Pestisida</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        {/* Tanggal */}
        <div className="mb-4">
          <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Tanggal</label>
          <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" />
        </div>

        {/* Jenis (multi-select with tags) */}
        <div className="mb-4">
          <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
            {tipe === 'pemupukan' ? 'Jenis Pupuk' : 'Jenis Pestisida'} (bisa lebih dari satu)
          </label>

          {/* Selected tags */}
          {jenisItems.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {jenisItems.map((j) => (
                <span key={j} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-[11px] font-medium">
                  {j}
                  <button type="button" onClick={() => removeJenis(j)}>
                    <IonIcon icon={closeCircle} className="text-emerald-600 text-sm" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Input */}
          <input
            type="text"
            value={jenisInput}
            onChange={(e) => setJenisInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={tipe === 'pemupukan' ? 'Ketik nama pupuk, tekan Enter' : 'Ketik nama pestisida, tekan Enter'}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
          />

          {/* Suggestions from history */}
          {filteredSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {filteredSuggestions.slice(0, 10).map((s) => (
                <button key={s} type="button" onClick={() => addJenis(s)} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors">
                  + {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Catatan */}
        <div className="mb-4">
          <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Catatan (opsional)</label>
          <input type="text" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Dosis, kondisi cuaca, dll" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" />
        </div>

        {/* Pilih tanaman */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-bold text-slate-700">Pilih Tanaman/Bedengan</p>
          <button type="button" onClick={selectAll} className="text-[11px] text-emerald-700 font-semibold">
            {selected.size === lahanList.length ? 'Batal Semua' : 'Pilih Semua'}
          </button>
        </div>

        <div className="space-y-2 pb-6">
          {lahanList.map((lahan) => {
            const isSelected = selected.has(lahan.client_uuid);
            return (
              <button
                key={lahan.client_uuid}
                type="button"
                onClick={() => toggle(lahan.client_uuid)}
                className={`w-full flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                  isSelected ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'
                }`}
              >
                <CommodityAvatar komoditas={lahan.komoditas} icon={lahan.icon} className="!w-9 !h-9 !text-lg !rounded-xl" />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[0.82rem] font-semibold text-slate-800 truncate">{lahan.komoditas}</p>
                  <p className="text-[11px] text-slate-500">Bed {lahan.nomor_bed}</p>
                </div>
                {isSelected && <IonIcon icon={checkmarkCircle} className="text-emerald-600 text-xl" />}
              </button>
            );
          })}
        </div>
      </IonContent>
    </IonModal>
  );
}
