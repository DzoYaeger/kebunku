import { IonIcon } from '@ionic/react';
import {
  trashOutline,
  cloudUploadOutline,
  leafOutline,
  flaskOutline,
  bugOutline,
  peopleOutline,
  hammerOutline,
  pricetagOutline,
  cashOutline,
  arrowUpOutline,
  arrowDownOutline,
} from 'ionicons/icons';
import type { TransaksiLocal } from '../../db';
import { formatRupiah, formatTanggal } from '../../utils/format';

const KATEGORI_ICON: Record<string, string> = {
  benih: leafOutline,
  pupuk: flaskOutline,
  pestisida: bugOutline,
  upah: peopleOutline,
  alat: hammerOutline,
  penjualan: cashOutline,
};

function iconFor(kategori: string, isMasuk: boolean): string {
  if (isMasuk) return cashOutline;
  return KATEGORI_ICON[kategori.toLowerCase()] ?? pricetagOutline;
}

interface Props {
  transaksi: TransaksiLocal;
  onDelete: (t: TransaksiLocal) => void;
}

export function TransaksiItem({ transaksi, onDelete }: Props): React.JSX.Element {
  const isMasuk = transaksi.tipe === 'kas_masuk';

  return (
    <div className="kbn-card kbn-card-press p-3.5 flex items-center gap-3 mb-2.5">
      {/* Avatar with direction indicator */}
      <div className="relative">
        <div
          className={`kbn-avatar ${
            isMasuk ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FFF1F2] text-[#e11d48]'
          }`}
          aria-hidden="true"
        >
          <IonIcon icon={iconFor(transaksi.kategori, isMasuk)} className="text-xl" />
        </div>
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
            isMasuk ? 'bg-[#15803D]' : 'bg-[#e11d48]'
          }`}
        >
          <IonIcon
            icon={isMasuk ? arrowDownOutline : arrowUpOutline}
            className="text-white text-[0.5rem]"
          />
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[0.84rem] font-semibold text-slate-dark capitalize truncate">
            {isMasuk && transaksi.komoditas ? transaksi.komoditas : transaksi.kategori}
          </span>
          {transaksi._dirty === 1 && (
            <IonIcon icon={cloudUploadOutline} className="text-slate-muted text-[0.7rem] shrink-0" />
          )}
        </div>
        <p className="text-[0.7rem] text-slate-muted mt-0.5 truncate">
          {formatTanggal(transaksi.tanggal)}
          {isMasuk && transaksi.kategori !== 'penjualan' ? ` · ${transaksi.kategori}` : ''}
          {transaksi.catatan ? ` · ${transaksi.catatan}` : ''}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className={`text-[0.88rem] font-bold ${isMasuk ? 'text-[#15803D]' : 'text-[#e11d48]'}`}>
          {isMasuk ? '+' : '-'}{formatRupiah(transaksi.nominal)}
        </p>
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={() => onDelete(transaksi)}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 shrink-0 transition-colors"
      >
        <IonIcon icon={trashOutline} className="text-sm" />
      </button>
    </div>
  );
}
