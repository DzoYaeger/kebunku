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
        className="kbn-card kbn-card-press w-full text-left p-3.5 flex items-center gap-3 mb-3"
      >
        <CommodityAvatar komoditas={lahan.komoditas} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-heading-md text-slate-dark truncate">{lahan.komoditas}</span>
            {lahan._dirty === 1 && (
              <IonIcon icon={cloudUploadOutline} className="text-slate-muted text-sm shrink-0" />
            )}
          </div>
          <p className="text-caption text-slate-muted mt-0.5">
            Bed {lahan.nomor_bed}
            {lahan.catatan ? ` · ${lahan.catatan}` : ''}
          </p>
        </div>
        <StatusBadge status={lahan.status} />
        <IonIcon icon={chevronForward} className="text-slate-300 text-base shrink-0" />
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
