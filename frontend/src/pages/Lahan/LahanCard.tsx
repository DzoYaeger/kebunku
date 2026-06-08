import { useState } from 'react';
import {
  IonIcon,
  IonActionSheet,
} from '@ionic/react';
import { createOutline, trashOutline, cloudUploadOutline, chevronForward, ellipsisVertical } from 'ionicons/icons';
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
  const [showActions, setShowActions] = useState(false);

  return (
    <>
      <div className="kbn-card kbn-card-press w-full p-4 flex items-center gap-3.5 mb-2.5">
        <button type="button" onClick={() => onOpen(lahan)} className="flex items-center gap-3.5 flex-1 min-w-0 text-left">
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

        {/* Menu titik tiga */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowActions(true); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-muted hover:bg-slate-100 shrink-0"
        >
          <IonIcon icon={ellipsisVertical} className="text-lg" />
        </button>
      </div>

      <IonActionSheet
        isOpen={showActions}
        onDidDismiss={() => setShowActions(false)}
        header={`${lahan.komoditas} · Bed ${lahan.nomor_bed}`}
        buttons={[
          { text: 'Edit', icon: createOutline, handler: () => onEdit(lahan) },
          { text: 'Hapus', icon: trashOutline, role: 'destructive', handler: () => onDelete(lahan) },
          { text: 'Batal', role: 'cancel' },
        ]}
      />
    </>
  );
}
