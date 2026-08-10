export default function Skeleton({ className = '', rounded = 'rounded-2xl' }) {
  return <div className={`skeleton ${rounded} ${className}`} aria-hidden="true" />;
}

export function SkeletonCard({ lines = 4 }) {
  return (
    <div className="card card-pad space-y-3">
      <Skeleton className="h-6 w-2/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i % 2 ? 'w-4/5' : 'w-full'}`} rounded="rounded-lg" />
      ))}
    </div>
  );
}
