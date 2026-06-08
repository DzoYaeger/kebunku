import { IonItemSliding, IonItemOptions, IonItemOption, IonIcon } from '@ionic/react';
import {
  trashOutline,
  cloudUploadOutline,
  leafOutline,
  swapHorizontalOutline,
  flaskOutline,
  bugOutline,
} from 'ionicons/icons';
import type { AktivitasLocal, LahanLocal } from '../../db';
import type { AktivitasTipe } from '../../types';

const TIPE_META: Record<AktivitasTipe, { label: string; icon: string; bg: string; fg: string; dotColor: string }> = {
  semai: { label: 'Semai', icon: leafOutline, bg: '#FEF3C7', fg: '#B45309', dotColor: '#F59E0B' },
  pindah_tanam: { label: 'Pindah Tanam', icon: swapHorizontalOutline, bg: '#DCFCE7', fg: '#15803D', dotColor: '#22C55E' },
  pemupukan: { label: 'Pemupukan', icon: flaskOutline, bg: '#E0F2FE', fg: '#0369A1', dotColor: '#0EA5E9' },
  pestisida: { label: 'Pestisida', icon: bugOutline, bg: '#FFE4E6', fg: '#BE123C', dotColor: '#F43F5E' },
};

interface Props {
  aktivitas: AktivitasLocal;
  lahan?: LahanLocal;
  onDelete: (a: AktivitasLocal) => void;
}

export function AktivitasItem({ aktivitas, lahan, onDelete }: Props): React.JSX.Element {
  const meta = TIPE_META[aktivitas.tipe];
  const bahan = aktivitas.jenis_pupuk ?? aktivitas.jenis_pestisida;

  return (
    <IonItemSliding>
      <div className="relative flex items-start gap-3 mb-2.5 pl-3">
        {/* Timeline dot */}
        <div
          className="absolute -left-[9px] top-4 w-4 h-4 rounded-full border-[3px] border-white shadow-sm z-10"
          style={{ background: meta.dotColor }}
        />

        {/* Card */}
        <div className="kbn-card kbn-card-press w-full p-3.5 flex items-center gap-3">
          <div
            className="kbn-avatar !w-10 !h-10 !rounded-xl"
            style={{ background: meta.bg, color: meta.fg }}
            aria-hidden="true"
          >
            <IonIcon icon={meta.icon} className="text-lg" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[0.84rem] font-bold text-slate-dark">{meta.label}</span>
              <span
                className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: meta.bg, color: meta.fg }}
              >
                {lahan?.komoditas ?? '—'}
              </span>
              {aktivitas._dirty === 1 && (
                <IonIcon icon={cloudUploadOutline} className="text-slate-muted text-[0.65rem] shrink-0" />
              )}
            </div>
            <p className="text-[0.7rem] text-slate-muted mt-0.5 truncate">
              {lahan ? `Bed ${lahan.nomor_bed}` : ''}
              {bahan ? ` · ${bahan}` : ''}
              {aktivitas.catatan ? ` · ${aktivitas.catatan}` : ''}
            </p>
          </div>
        </div>
      </div>
      <IonItemOptions side="end">
        <IonItemOption color="danger" onClick={() => onDelete(aktivitas)}>
          <IonIcon slot="icon-only" icon={trashOutline} />
        </IonItemOption>
      </IonItemOptions>
    </IonItemSliding>
  );
}
