import type { LahanStatus } from '../types';

const LABEL: Record<LahanStatus, string> = {
  semai: 'Semai',
  aktif: 'Aktif',
  selesai: 'Selesai',
};

const CLASS: Record<LahanStatus, string> = {
  semai: 'badge badge-semai',
  aktif: 'badge badge-aktif',
  selesai: 'badge badge-selesai',
};

export function StatusBadge({ status }: { status: LahanStatus }): React.JSX.Element {
  return <span className={CLASS[status]}>{LABEL[status]}</span>;
}
