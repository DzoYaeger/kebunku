import { IonItemSliding, IonItemOptions, IonItemOption, IonIcon } from '@ionic/react';
import {
  trashOutline,
  cloudUploadOutline,
  leafOutline,
  flaskOutline,
  bugOutline,
  peopleOutline,
  hammerOutline,
  pricetagOutline,
} from 'ionicons/icons';
import type { TransaksiLocal } from '../../db';
import { formatRupiah, formatTanggal } from '../../utils/format';

const KATEGORI_ICON: Record<string, string> = {
  benih: leafOutline,
  pupuk: flaskOutline,
  pestisida: bugOutline,
  upah: peopleOutline,
  alat: hammerOutline,
};

function iconFor(kategori: string): string {
  return KATEGORI_ICON[kategori.toLowerCase()] ?? pricetagOutline;
}

interface Props {
  transaksi: TransaksiLocal;
  onDelete: (t: TransaksiLocal) => void;
}

export function TransaksiItem({ transaksi, onDelete }: Props): React.JSX.Element {
  return (
    <IonItemSliding>
      <div className="kbn-card p-3.5 flex items-center gap-3 mb-3">
        <div className="kbn-avatar bg-[#FFE4E6] text-[#b91c1c]" aria-hidden="true">
          <IonIcon icon={iconFor(transaksi.kategori)} className="text-xl" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-heading-md text-slate-dark capitalize truncate">{transaksi.kategori}</span>
            {transaksi._dirty === 1 && (
              <IonIcon icon={cloudUploadOutline} className="text-slate-muted text-sm shrink-0" />
            )}
          </div>
          <p className="text-caption text-slate-muted mt-0.5 truncate">
            {formatTanggal(transaksi.tanggal)}
            {transaksi.catatan ? ` · ${transaksi.catatan}` : ''}
          </p>
        </div>
        <span className="text-heading-md font-bold text-[#b91c1c] shrink-0">
          -{formatRupiah(transaksi.nominal)}
        </span>
      </div>
      <IonItemOptions side="end">
        <IonItemOption color="danger" onClick={() => onDelete(transaksi)}>
          <IonIcon slot="icon-only" icon={trashOutline} />
        </IonItemOption>
      </IonItemOptions>
    </IonItemSliding>
  );
}
