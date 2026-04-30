'use client';
import { useState, useTransition } from 'react';

import { removeProgressAction, updateProgressAction } from '@/features/profile/actions';
import ProgressStatusPicker from '@/features/profile/components/ProgressStatusPicker';
import type { LearnStatus } from '@/shared/types';

export function MoveProgressPicker({
  moveId,
  initialStatus,
}: {
  moveId: string;
  initialStatus: LearnStatus | null;
}) {
  const [status, setStatus] = useState<LearnStatus | null>(initialStatus);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: LearnStatus | null) {
    const previous = status;
    setStatus(next);
    startTransition(async () => {
      try {
        if (next === null) {
          await removeProgressAction(moveId);
        } else {
          await updateProgressAction(moveId, next);
        }
      } catch {
        setStatus(previous);
      }
    });
  }

  return (
    <ProgressStatusPicker
      currentStatus={status}
      onStatusChange={handleChange}
      isPending={isPending}
    />
  );
}
