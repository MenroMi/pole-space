'use client';
import { Button } from '@/shared/components/ui/button';
import type { LearnStatus } from '@/shared/types';

const STATUSES: { value: LearnStatus; label: string }[] = [
  { value: 'WANT_TO_LEARN', label: 'Want to Learn' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'LEARNED', label: 'Learned' },
];

interface ProgressStatusPickerProps {
  currentStatus: LearnStatus;
  onStatusChange: (status: LearnStatus) => void;
  isPending: boolean;
}

export default function ProgressStatusPicker({
  currentStatus,
  onStatusChange,
  isPending,
}: ProgressStatusPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUSES.map(({ value, label }) => (
        <Button
          key={value}
          size="sm"
          variant={currentStatus === value ? 'default' : 'ghost'}
          onClick={() => onStatusChange(value)}
          disabled={isPending || currentStatus === value}
          aria-pressed={currentStatus === value}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
