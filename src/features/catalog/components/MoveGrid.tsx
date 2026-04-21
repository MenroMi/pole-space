'use client';
import { useState, useRef, useEffect } from 'react';

import { getMovesAction } from '../actions';
import type { MoveWithTags, MoveFilters } from '../types';

import MoveCard from './MoveCard';

const PAGE_SIZE = 12;

interface MoveGridProps {
  initialMoves: MoveWithTags[];
  initialHasMore: boolean;
  filters: MoveFilters;
}

export default function MoveGrid({ initialMoves, initialHasMore, filters }: MoveGridProps) {
  const [moves, setMoves] = useState(initialMoves);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const pageRef = useRef(1);

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    let cancelled = false;

    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || isLoadingRef.current) return;

      isLoadingRef.current = true;
      setLoading(true);

      try {
        const nextPage = pageRef.current + 1;
        const result = await getMovesAction({ ...filters, page: nextPage, pageSize: PAGE_SIZE });

        if (cancelled) return;

        pageRef.current = nextPage;
        setMoves((prev) => [...prev, ...result.items]);
        setHasMore(result.items.length >= PAGE_SIZE);
      } finally {
        if (!cancelled) {
          isLoadingRef.current = false;
          setLoading(false);
        }
      }
    });

    observer.observe(sentinel);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
    // filters is stable for this component's lifetime — parent remounts via `key` prop when filters change
  }, [hasMore]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {moves.map((move) => (
          <MoveCard key={move.id} move={move} />
        ))}
      </div>
      {loading && (
        <div className="flex justify-center py-8" data-testid="loading-spinner">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {hasMore && <div ref={sentinelRef} data-testid="sentinel" />}
    </div>
  );
}
