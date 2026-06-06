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
import { formatTanggal } from '../../utils/format';

const TIPE_META: Record<AktivitasTipe, { label: string; icon: string; bg: string; fg: string }> = {
  semai: { label: 'Semai', icon: leafOutline, bg: '#FEF3C7', fg: '#B45309' },
  pindah_tanam: { label: 'Pindah Tanam', icon: swapHorizontalOutline, bg: '#DCFCE7', fg: '#15803D' },
  pemupukan: { label: 'Pemupukan', icon: flaskOutline, bg: '#E0F2FE', fg: '#0369A1' },
  pestisida: { label: 'Pestisida', icon: bugOutline, bg: '#FFE4E6', fg: '#BE123C' },
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
      <div className="kbn-card p-3.5 flex items-center gap-3 mb-3">
        <div
          className="kbn-avatar"
          style={{ background: meta.bg, color: meta.fg }}
          aria-hidden="true"
        >
          <IonIcon icon={meta.icon} className="text-xl" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-heading-md text-slate-dark truncate">{meta.label}</span>
            {aktivitas._dirty === 1 && (
              <IonIcon icon={cloudUploadOutline} className="text-slate-muted text-sm shrink-0" />
            )}
          </div>
          <p className="text-caption text-slate-muted mt-0.5 truncate">
            {lahan ? `Bed ${lahan.nomor_bed} · ${lahan.komoditas}` : 'Lahan'}
            {bahan ? ` · ${bahan}` : ''}
          </p>
        </div>
        <span className="text-caption text-slate-muted shrink-0">{formatTanggal(aktivitas.tanggal)}</span>
      </div>
      <IonItemOptions side="end">
        <IonItemOption color="danger" onClick={() => onDelete(aktivitas)}>
          <IonIcon slot="icon-only" icon={trashOutline} />
        </IonItemOption>
      </IonItemOptions>
    </IonItemSliding>
  );
}
