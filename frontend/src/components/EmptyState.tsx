import { IonIcon, IonButton } from '@ionic/react';
import { add } from 'ionicons/icons';

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// Empty state ilustratif: lingkaran gradien lembut + ikon + ajakan aksi.
export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: Props): React.JSX.Element {
  return (
    <div className="kbn-fade-up flex flex-col items-center justify-center text-center px-8 mt-20">
      <div className="relative mb-5">
        <div className="absolute inset-0 bg-emerald/10 blur-2xl rounded-full" />
        <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-[#DCFCE7] to-[#bbf7d0] flex items-center justify-center">
          <IonIcon icon={icon} className="text-4xl text-emerald-deep" />
        </div>
      </div>
      <h2 className="text-heading-md text-slate-dark">{title}</h2>
      {subtitle && <p className="text-body text-slate-muted mt-1 max-w-xs">{subtitle}</p>}
      {actionLabel && onAction && (
        <IonButton className="mt-5" onClick={onAction}>
          <IonIcon slot="start" icon={add} />
          {actionLabel}
        </IonButton>
      )}
    </div>
  );
}
