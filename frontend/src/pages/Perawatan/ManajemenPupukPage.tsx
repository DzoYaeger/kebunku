import { useState, useCallback } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonModal,
  IonLabel,
  IonToast,
  IonSegment,
  IonSegmentButton,
  IonText,
  useIonViewWillEnter,
} from '@ionic/react';
import { addOutline, trashOutline, leafOutline, bugOutline, createOutline } from 'ionicons/icons';
import { api } from '../../api/client';
import { SyncIndicator } from '../../components/SyncIndicator';

interface PupukItem {
  id: number;
  nama: string;
  tipe: 'pupuk' | 'pestisida';
  satuan: string | null;
  stok: string | null;
  catatan: string | null;
}

export default function ManajemenPupukPage(): React.JSX.Element {
  const [items, setItems] = useState<PupukItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'semua' | 'pupuk' | 'pestisida'>('semua');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Form
  const [nama, setNama] = useState('');
  const [tipe, setTipe] = useState<'pupuk' | 'pestisida'>('pupuk');
  const [satuan, setSatuan] = useState('');
  const [stok, setStok] = useState('');
  const [catatan, setCatatan] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<{ data: PupukItem[] }>('/pupuk-inventory');
      setItems(res.data.data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useIonViewWillEnter(() => { void fetchData(); });

  const handleRefresh = async (e: CustomEvent): Promise<void> => {
    await fetchData();
    (e.detail as { complete: () => void }).complete();
  };

  const openAdd = (): void => {
    setEditId(null);
    setNama('');
    setTipe('pupuk');
    setSatuan('');
    setStok('');
    setCatatan('');
    setModal(true);
  };

  const openEdit = (item: PupukItem): void => {
    setEditId(item.id);
    setNama(item.nama);
    setTipe(item.tipe);
    setSatuan(item.satuan ?? '');
    setStok(item.stok ?? '');
    setCatatan(item.catatan ?? '');
    setModal(true);
  };

  const saveItem = async (): Promise<void> => {
    if (!nama.trim()) return;
    setSaving(true);
    try {
      const body = {
        nama: nama.trim(),
        tipe,
        satuan: satuan.trim() || null,
        stok: stok ? Number(stok) : null,
        catatan: catatan.trim() || null,
      };
      if (editId) {
        await api.put(`/pupuk-inventory/${editId}`, body);
        setToast('✅ Berhasil diperbarui.');
      } else {
        await api.post('/pupuk-inventory', body);
        setToast('✅ Berhasil ditambahkan.');
      }
      setModal(false);
      await fetchData();
    } catch {
      setToast('Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: number): Promise<void> => {
    try {
      await api.delete(`/pupuk-inventory/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setToast('Item dihapus.');
    } catch {
      setToast('Gagal menghapus.');
    }
  };

  const filtered = filter === 'semua' ? items : items.filter((i) => i.tipe === filter);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle className="font-semibold text-base">Manajemen Pupuk</IonTitle>
          <IonButtons slot="end"><SyncIndicator /></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={(e) => void handleRefresh(e)}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="px-4 pb-24 pt-2">
          <div className="flex items-center gap-2 mb-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="flex-1 text-center">
              <p className="text-lg font-bold text-green-700">{items.filter((i) => i.tipe === 'pupuk').length}</p>
              <p className="text-[10px] text-slate-500">Jenis Pupuk</p>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="flex-1 text-center">
              <p className="text-lg font-bold text-amber-600">{items.filter((i) => i.tipe === 'pestisida').length}</p>
              <p className="text-[10px] text-slate-500">Jenis Pestisida</p>
            </div>
          </div>

          <IonSegment value={filter} onIonChange={(e) => setFilter(e.detail.value as typeof filter)} className="mb-3">
            <IonSegmentButton value="semua"><IonLabel className="text-xs">Semua</IonLabel></IonSegmentButton>
            <IonSegmentButton value="pupuk"><IonLabel className="text-xs">Pupuk</IonLabel></IonSegmentButton>
            <IonSegmentButton value="pestisida"><IonLabel className="text-xs">Pestisida</IonLabel></IonSegmentButton>
          </IonSegment>

          {loading ? (
            <div className="flex justify-center py-10"><IonSpinner name="crescent" color="primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <IonIcon icon={leafOutline} className="text-4xl text-slate-300 mb-2" />
              <IonText color="medium">
                <p className="text-sm">Belum ada data.</p>
                <p className="text-xs mt-1">Tambahkan pupuk/pestisida yang kamu punya agar AI bisa merekomendasikan kombinasi yang tepat.</p>
              </IonText>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openEdit(item)}
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm w-full text-left active:bg-slate-50 touch-manipulation"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.tipe === 'pupuk' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                    <IonIcon icon={item.tipe === 'pupuk' ? leafOutline : bugOutline} className="text-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.nama}</p>
                    <p className="text-[11px] text-slate-500">
                      {item.tipe === 'pupuk' ? 'Pupuk' : 'Pestisida'}
                      {item.satuan ? ` · ${item.satuan}` : ''}
                      {item.stok ? ` · Stok: ${item.stok}` : ''}
                    </p>
                  </div>
                  <IonIcon icon={createOutline} className="text-slate-400 text-lg shrink-0" />
                </button>
              ))}
            </div>
          )}

          <div className="fixed bottom-20 right-4 z-10">
            <button
              type="button"
              onClick={openAdd}
              className="w-14 h-14 rounded-full bg-emerald shadow-lg flex items-center justify-center text-white active:scale-95 transition-transform touch-manipulation"
            >
              <IonIcon icon={addOutline} className="text-2xl" />
            </button>
          </div>
        </div>
      </IonContent>

      {/* Add/Edit Modal */}
      <IonModal isOpen={modal} onDidDismiss={() => setModal(false)} initialBreakpoint={0.85} breakpoints={[0, 0.85, 1]}>
        <IonContent className="ion-padding">
          <p className="text-sm font-bold text-slate-800 mb-4">{editId ? 'Edit' : 'Tambah'} Pupuk / Pestisida</p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Nama *</label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: NPK 16-16-16, Abamektin"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-emerald"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Tipe</label>
              <select
                value={tipe}
                onChange={(e) => setTipe(e.target.value as 'pupuk' | 'pestisida')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-emerald"
              >
                <option value="pupuk">Pupuk</option>
                <option value="pestisida">Pestisida</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Satuan</label>
              <input
                type="text"
                value={satuan}
                onChange={(e) => setSatuan(e.target.value)}
                placeholder="kg, liter, gram"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-emerald"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Stok</label>
              <input
                type="number"
                value={stok}
                onChange={(e) => setStok(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-emerald"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Catatan</label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Catatan tambahan (opsional)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-emerald"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            {editId && (
              <IonButton fill="outline" color="danger" className="flex-1" onClick={() => { void deleteItem(editId); setModal(false); }}>
                <IonIcon icon={trashOutline} slot="start" />
                Hapus
              </IonButton>
            )}
            <IonButton expand="block" className="flex-1" onClick={() => void saveItem()} disabled={saving || !nama.trim()}>
              {saving ? <IonSpinner name="dots" className="w-4 h-4 mr-2" /> : null}
              {editId ? 'Simpan' : 'Tambah'}
            </IonButton>
          </div>
        </IonContent>
      </IonModal>

      <IonToast isOpen={toast !== null} message={toast ?? ''} duration={2500} onDidDismiss={() => setToast(null)} color="success" />
    </IonPage>
  );
}
