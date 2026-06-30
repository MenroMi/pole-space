import { cn } from '@/shared/lib/utils';

type SkeletonProps = {
  className?: string;
  style?: React.CSSProperties;
};

// Reuses the global `@keyframes shimmer` from globals.css, which is already
// neutralized under prefers-reduced-motion.
export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(className)}
      style={{
        background:
          'linear-gradient(90deg, rgba(75,68,80,0.1) 25%, rgba(75,68,80,0.25) 50%, rgba(75,68,80,0.1) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s ease-in-out infinite',
        borderRadius: 8,
        ...style,
      }}
    />
  );
}
