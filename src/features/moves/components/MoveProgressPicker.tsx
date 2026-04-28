'use client';
import { useState, useTransition } from 'react';

import { updateProgressAction } from '@/features/profile/actions';
import ProgressStatusPicker from '@/features/profile/components/ProgressStatusPicker';
import type { LearnStatus } from '@/shared/types';

export function MoveProgressPicker({
  moveId,
  initialStatus,
}: {
  moveId: string;
  initialStatus: LearnStatus | null;
}) {
  const [status, setStatus] = useState<LearnStatus>(initialStatus ?? 'WANT_TO_LEARN');
  const [isPending, startTransition] = useTransition();

  function handleChange(next: LearnStatus) {
    setStatus(next);
    startTransition(() => {
      updateProgressAction(moveId, next);
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
