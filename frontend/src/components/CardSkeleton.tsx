// Skeleton loading kartu (shimmer) untuk list saat memuat.
interface Props {
  count?: number;
  hero?: boolean;
}

export function CardSkeleton({ count = 4, hero = false }: Props): React.JSX.Element {
  return (
    <div className="space-y-3">
      {hero && <div className="kbn-skeleton h-32 w-full !rounded-[22px]" />}
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="kbn-card p-4 flex items-center gap-3">
          <div className="kbn-skeleton h-11 w-11 !rounded-[14px]" />
          <div className="flex-1 space-y-2">
            <div className="kbn-skeleton h-3.5 w-1/2" />
            <div className="kbn-skeleton h-3 w-1/3" />
          </div>
          <div className="kbn-skeleton h-5 w-14 !rounded-full" />
        </div>
      ))}
    </div>
  );
}
