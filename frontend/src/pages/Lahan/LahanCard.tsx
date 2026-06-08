import {
  IonIcon,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
} from '@ionic/react';
import { createOutline, trashOutline, cloudUploadOutline, chevronForward } from 'ionicons/icons';
import type { LahanLocal } from '../../db';
import { StatusBadge } from '../../components/StatusBadge';
import { CommodityAvatar } from '../../components/CommodityAvatar';

interface Props {
  lahan: LahanLocal;
  onOpen: (lahan: LahanLocal) => void;
  onEdit: (lahan: LahanLocal) => void;
  onDelete: (lahan: LahanLocal) => void;
}

export function LahanCard({ lahan, onOpen, onEdit, onDelete }: Props): React.JSX.Element {
  return (
    <IonItemSliding>
      <button
        type="button"
        onClick={() => onOpen(lahan)}
        className="kbn-card kbn-card-press w-full text-left p-4 flex items-center gap-3.5 mb-2.5"
      >
        <CommodityAvatar komoditas={lahan.komoditas} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[0.88rem] font-bold text-slate-dark truncate">{lahan.komoditas}</span>
            <StatusBadge status={lahan.status} />
            {lahan._dirty === 1 && (
              <IonIcon icon={cloudUploadOutline} className="text-slate-muted text-[0.7rem] shrink-0" />
            )}
          </div>
          <p className="text-[0.72rem] text-slate-muted mt-1 flex items-center gap-1.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-600">
              {lahan.nomor_bed}
            </span>
            {lahan.catatan && <span className="truncate">· {lahan.catatan}</span>}
          </p>
        </div>
        <IonIcon icon={chevronForward} className="text-slate-300 text-lg shrink-0" />
      </button>

      <IonItemOptions side="end">
        <IonItemOption color="medium" onClick={() => onEdit(lahan)}>
          <IonIcon slot="icon-only" icon={createOutline} />
        </IonItemOption>
        <IonItemOption color="danger" onClick={() => onDelete(lahan)}>
          <IonIcon slot="icon-only" icon={trashOutline} />
        </IonItemOption>
      </IonItemOptions>
    </IonItemSliding>
  );
}
