import { Loader2 } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

type SpinnerProps = {
  size?: number;
  className?: string;
};

export function Spinner({ size = 16, className }: SpinnerProps) {
  return <Loader2 size={size} aria-hidden="true" className={cn('animate-spin', className)} />;
}
