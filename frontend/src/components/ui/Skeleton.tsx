interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'text-sm' | 'avatar' | 'card' | 'button' | 'custom';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export default function Skeleton({
  className = '',
  variant = 'custom',
  width,
  height,
  count = 1,
}: SkeletonProps) {
  const variantClasses = {
    text: 'skeleton skeleton-text',
    'text-sm': 'skeleton skeleton-text-sm',
    avatar: 'skeleton skeleton-avatar',
    card: 'skeleton skeleton-card',
    button: 'skeleton skeleton-button',
    custom: 'skeleton',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  const elements = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`${variantClasses[variant]} ${className}`}
      style={style}
    />
  ));

  return count === 1 ? elements[0] : <>{elements}</>;
}

// Pre-built skeleton components for common use cases
export function SkeletonCard() {
  return (
    <div className="glass-card p-6">
      <div className="flex items-start gap-4 mb-4">
        <Skeleton variant="avatar" />
        <div className="flex-1">
          <Skeleton variant="text" width="60%" className="mb-2" />
          <Skeleton variant="text-sm" width="40%" />
        </div>
      </div>
      <Skeleton height={80} className="mb-4" />
      <div className="flex gap-2">
        <Skeleton variant="button" />
        <Skeleton variant="button" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-[var(--glass-border)]">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} variant="text-sm" width={`${100 / columns}%`} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b border-[var(--glass-border)] last:border-0">
          {Array.from({ length: columns }, (_, colIndex) => (
            <Skeleton key={colIndex} variant="text" width={`${100 / columns}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCricketerCard() {
  return (
    <div className="cricketer-card p-6">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton width={80} height={80} className="rounded-full" />
        <div className="flex-1">
          <Skeleton variant="text" width="70%" className="mb-2" />
          <Skeleton variant="text-sm" width="40%" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton height={60} />
        <Skeleton height={60} />
        <Skeleton height={60} />
      </div>
    </div>
  );
}

export function SkeletonLeaderboard() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="glass-card p-4 flex items-center gap-4">
          <Skeleton width={40} height={40} className="rounded-lg" />
          <div className="flex-1">
            <Skeleton variant="text" width="50%" className="mb-1" />
            <Skeleton variant="text-sm" width="30%" />
          </div>
          <Skeleton width={60} height={32} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Skeleton width={200} height={36} />
        <Skeleton variant="button" width={120} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="glass-card p-6">
            <Skeleton variant="text-sm" width="40%" className="mb-2" />
            <Skeleton width={100} height={40} className="mb-2" />
            <Skeleton variant="text-sm" width="60%" />
          </div>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
