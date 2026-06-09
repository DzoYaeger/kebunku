import { useState, useCallback } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonButton,
  IonSpinner,
  IonIcon,
  IonText,
  IonRefresher,
  IonRefresherContent,
  IonModal,
  IonTextarea,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonToast,
  useIonViewWillEnter,
} from '@ionic/react';
import { sparkles, calendarOutline, leaf, bug, checkmarkCircle, chatbubbleOutline, refreshOutline, cameraOutline } from 'ionicons/icons';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { CarePlan, PlantFeedback, ApiResource } from '../../types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function aktIcon(aktivitas: string): string {
  if (aktivitas.includes('pupuk') || aktivitas.includes('pemupukan')) return leaf;
  if (aktivitas.includes('pestisida') || aktivitas.includes('semprot')) return bug;
  return calendarOutline;
}

function aktColor(aktivitas: string): string {
  if (aktivitas.includes('pupuk') || aktivitas.includes('pemupukan')) return 'text-green-600 bg-green-50';
  if (aktivitas.includes('pestisida') || aktivitas.includes('semprot')) return 'text-amber-600 bg-amber-50';
  return 'text-blue-600 bg-blue-50';
}

export default function CarePlanPage(): React.JSX.Element {
  const { lahanId } = useParams<{ lahanId: string }>();
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [feedbackList, setFeedbackList] = useState<PlantFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [segment, setSegment] = useState<'jadwal' | 'feedback'>('jadwal');
  const [toast, setToast] = useState<string | null>(null);
  // Feedback modal
  const [fbModal, setFbModal] = useState(false);
  const [fbTipe, setFbTipe] = useState<'progress' | 'keluhan'>('progress');
  const [fbText, setFbText] = useState('');
  const [fbImage, setFbImage] = useState<File | null>(null);
  const [fbImagePreview, setFbImagePreview] = useState<string | null>(null);
  const [fbLoading, setFbLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [planRes, fbRes] = await Promise.all([
        api.get<{ data: CarePlan[] }>('/care-plans', { params: { lahan_id: lahanId } }),
        api.get<{ data: PlantFeedback[] }>('/plant-feedback', { params: { lahan_id: lahanId } }),
      ]);
      setPlan(planRes.data.data[0] ?? null);
      setFeedbackList(fbRes.data.data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [lahanId]);

  useIonViewWillEnter(() => { void fetchData(); });

  const handleRefresh = async (e: CustomEvent): Promise<void> => {
    await fetchData();
    (e.detail as { complete: () => void }).complete();
  };

  const generatePlan = async (): Promise<void> => {
    setGenerating(true);
    try {
      const res = await api.post<ApiResource<CarePlan>>('/care-plans/generate', { lahan_id: Number(lahanId) });
      setPlan(res.data.data);
      setToast('✅ Rencana perawatan berhasil dibuat!');
    } catch {
      setToast('Gagal membuat rencana. Coba lagi.');
    } finally {
      setGenerating(false);
    }
  };

  const submitFeedback = async (): Promise<void> => {
    if (!fbText.trim()) return;
    setFbLoading(true);
    try {
      const formData = new FormData();
      formData.append('lahan_id', lahanId);
      formData.append('tipe', fbTipe);
      formData.append('content', fbText.trim());
      if (fbImage) formData.append('image', fbImage);

      const res = await api.post<ApiResource<PlantFeedback>>('/plant-feedback', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFeedbackList((prev) => [res.data.data, ...prev]);
      setFbModal(false);
      setFbText('');
      setFbImage(null);
      setFbImagePreview(null);
      setToast('✅ Feedback dikirim, saran AI sudah tersedia.');
    } catch {
      setToast('Gagal mengirim feedback.');
    } finally {
      setFbLoading(false);
    }
  };

  const handleFbImage = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFbImage(file);
    setFbImagePreview(URL.createObjectURL(file));
  };

  const komoditas = plan?.lahan?.komoditas ?? '';
  const nomorBed = plan?.lahan?.nomor_bed ?? '';

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/app/perawatan" text="" /></IonButtons>
          <IonTitle className="font-semibold text-base">Rencana Perawatan</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={(e) => void handleRefresh(e)}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="px-4 pb-24 pt-2">
          {loading ? (
            <div className="flex justify-center py-10"><IonSpinner name="crescent" color="primary" /></div>
          ) : !plan ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <IonIcon icon={sparkles} className="text-5xl text-slate-300 mb-3" />
              <IonText color="medium">
                <p className="text-sm font-semibold">Belum ada rencana perawatan</p>
                <p className="text-xs mt-1">Generate rencana AI untuk mendapatkan jadwal pupuk & pestisida otomatis.</p>
              </IonText>
              <IonButton className="mt-4" onClick={() => void generatePlan()} disabled={generating}>
                {generating ? <IonSpinner name="dots" className="w-4 h-4 mr-2" /> : <IonIcon icon={sparkles} slot="start" />}
                <IonLabel>Generate Rencana AI</IonLabel>
              </IonButton>
            </div>
          ) : (
            <>
              {/* Plan header */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <IonIcon icon={leaf} className="text-emerald-600 text-xl" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{komoditas}</p>
                    <p className="text-[11px] text-slate-500">Bed {nomorBed}</p>
                  </div>
                  <IonButton
                    fill="clear"
                    size="small"
                    className="ml-auto"
                    onClick={() => void generatePlan()}
                    disabled={generating}
                  >
                    {generating ? <IonSpinner name="dots" className="w-4 h-4" /> : <IonIcon icon={refreshOutline} />}
                  </IonButton>
                </div>
                <p className="text-[12px] text-slate-700 leading-relaxed">{plan.summary}</p>
                <p className="text-[10px] text-slate-400 mt-2">Dibuat: {formatDate(plan.created_at)}</p>
              </div>

              {/* Segment */}
              <IonSegment value={segment} onIonChange={(e) => setSegment(e.detail.value as 'jadwal' | 'feedback')}>
                <IonSegmentButton value="jadwal">
                  <IonLabel className="text-xs">Jadwal ({plan.schedule.length})</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="feedback">
                  <IonLabel className="text-xs">Feedback ({feedbackList.length})</IonLabel>
                </IonSegmentButton>
              </IonSegment>

              {segment === 'jadwal' ? (
                <div className="mt-4 space-y-2.5">
                  {plan.schedule.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-6">Tidak ada jadwal.</p>
                  ) : (
                    plan.schedule.map((item, idx) => {
                      const isPast = new Date(item.tanggal) < new Date();
                      return (
                        <div key={idx} className={`flex gap-3 p-3 rounded-xl border ${isPast ? 'bg-slate-50 border-slate-100 opacity-70' : 'bg-white border-slate-100 shadow-sm'}`}>
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${aktColor(item.aktivitas)}`}>
                            <IonIcon icon={isPast ? checkmarkCircle : aktIcon(item.aktivitas)} className="text-lg" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-slate-800 capitalize">{item.aktivitas}</span>
                              <span className="text-[10px] text-slate-400 ml-auto">Minggu {item.minggu}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">{item.detail}</p>
                            {item.catatan && <p className="text-[10px] text-slate-400 mt-0.5 italic">{item.catatan}</p>}
                            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                              <IonIcon icon={calendarOutline} className="text-xs" />
                              {formatDate(item.tanggal)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="mt-4">
                  <IonButton expand="block" fill="outline" size="small" onClick={() => { setFbModal(true); setFbTipe('progress'); setFbText(''); setFbImage(null); setFbImagePreview(null); }}>
                    <IonIcon icon={chatbubbleOutline} slot="start" />
                    <IonLabel>Kirim Feedback / Keluhan</IonLabel>
                  </IonButton>

                  {feedbackList.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-6">Belum ada feedback. Kirim update kemajuan tanaman untuk mendapat saran AI.</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {feedbackList.map((fb) => (
                        <div key={fb.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${fb.tipe === 'keluhan' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                              {fb.tipe === 'keluhan' ? 'Keluhan' : 'Progress'}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-auto">{formatDate(fb.created_at)}</span>
                          </div>
                          <p className="text-[11px] text-slate-700 mb-2">{fb.content}</p>
                          {fb.image_url && (
                            <img src={fb.image_url} alt="Foto" className="w-full h-32 object-cover rounded-lg mb-2 border border-slate-100" />
                          )}
                          {fb.ai_response && (
                            <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                              <p className="text-[10px] font-semibold text-emerald-800 mb-1 flex items-center gap-1">
                                <IonIcon icon={sparkles} className="text-sm" /> Saran AI
                              </p>
                              <p className="text-[11px] text-slate-700 whitespace-pre-line leading-relaxed">{fb.ai_response}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </IonContent>

      {/* Feedback Modal */}
      <IonModal isOpen={fbModal} onDidDismiss={() => setFbModal(false)} initialBreakpoint={0.75} breakpoints={[0, 0.75, 1]}>
        <IonContent className="ion-padding">
          <p className="text-sm font-bold text-slate-800 mb-3">Kirim Feedback</p>

          <IonSegment value={fbTipe} onIonChange={(e) => setFbTipe(e.detail.value as 'progress' | 'keluhan')} className="mb-3">
            <IonSegmentButton value="progress"><IonLabel className="text-xs">Progress / Update</IonLabel></IonSegmentButton>
            <IonSegmentButton value="keluhan"><IonLabel className="text-xs">Keluhan / Masalah</IonLabel></IonSegmentButton>
          </IonSegment>

          <IonTextarea
            placeholder={fbTipe === 'keluhan' ? 'Jelaskan masalah yang terlihat...' : 'Ceritakan perkembangan tanaman...'}
            value={fbText}
            onIonInput={(e) => setFbText(e.detail.value ?? '')}
            rows={4}
            className="border border-slate-200 rounded-lg text-sm"
          />

          <label className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 p-3 mt-3 cursor-pointer">
            <IonIcon icon={cameraOutline} className="text-xl text-slate-500" />
            <span className="text-[12px] text-slate-600 font-medium">{fbImage ? 'Ganti foto' : 'Tambah foto (opsional)'}</span>
            <input type="file" accept="image/*" capture="environment" onChange={handleFbImage} className="hidden" />
          </label>
          {fbImagePreview && (
            <img src={fbImagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg mt-2 border" />
          )}

          <IonButton expand="block" className="mt-4" disabled={fbLoading || !fbText.trim()} onClick={() => void submitFeedback()}>
            {fbLoading ? <IonSpinner name="dots" className="w-4 h-4 mr-2" /> : <IonIcon icon={sparkles} slot="start" />}
            <IonLabel>{fbLoading ? 'Memproses...' : 'Kirim & Dapatkan Saran AI'}</IonLabel>
          </IonButton>
        </IonContent>
      </IonModal>

      <IonToast isOpen={toast !== null} message={toast ?? ''} duration={3000} onDidDismiss={() => setToast(null)} color="success" />
    </IonPage>
  );
}
