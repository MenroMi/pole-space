'use client';
import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Search, X } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';
import { Category, Difficulty } from '@/shared/types/enums';

import type { MoveFilters } from '../types';

const CATEGORIES = Object.values(Category);
const DIFFICULTIES = Object.values(Difficulty);

type CatalogFiltersProps = {
  filters: MoveFilters;
};

export default function CatalogFilters({ filters }: CatalogFiltersProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(filters.search ?? '');
  // Always keep a string ('' = none open) so Radix Accordion stays in controlled mode.
  // Passing `undefined` would flip it to uncontrolled and cause stale internal state.
  const [openCategory, setOpenCategory] = useState<string>(filters.category ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCategoryRef = useRef<Category | undefined>(filters.category);

  // Sync accordion open-state with URL changes from outside.
  // Only fires when filters.category actually changed between renders,
  // so manually collapsing/expanding isn't fought by the effect.
  useEffect(() => {
    if (filters.category !== prevCategoryRef.current) {
      setOpenCategory(filters.category ?? '');
    }
    prevCategoryRef.current = filters.category;
  }, [filters.category]);

  const navigate = (overrides: {
    category?: Category | null;
    difficulty?: Difficulty | null;
    resetSearch?: boolean;
  }) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const nextCategory = 'category' in overrides ? overrides.category : filters.category;
    const nextDifficulty = 'difficulty' in overrides ? overrides.difficulty : filters.difficulty;
    const nextSearch = overrides.resetSearch ? '' : searchValue;

    if (overrides.resetSearch) setSearchValue('');

    const params = new URLSearchParams();
    if (nextCategory) params.set('category', nextCategory);
    if (nextDifficulty) params.set('difficulty', nextDifficulty);
    if (nextSearch) params.set('search', nextSearch);
    const query = params.toString();
    router.replace(`/catalog${query ? `?${query}` : ''}`);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const params = new URLSearchParams();
      if (filters.category) params.set('category', filters.category);
      if (filters.difficulty) params.set('difficulty', filters.difficulty);
      if (value) params.set('search', value);
      const query = params.toString();
      router.replace(`/catalog${query ? `?${query}` : ''}`);
    }, 300);
  };

  const isActive = !!filters.category || !!filters.difficulty || !!filters.search;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search moves"
          placeholder="Search moves..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchValue && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => navigate({ resetSearch: true })}
            className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Accordion
        type="single"
        collapsible
        value={openCategory}
        onValueChange={setOpenCategory}
        aria-label="Filter by category"
        className="w-full"
      >
        {CATEGORIES.map((category) => (
          <AccordionItem key={category} value={category}>
            <AccordionTrigger
              onClick={() => {
                if (filters.category === category) {
                  navigate({ category: null, difficulty: null });
                }
              }}
              className={cn(
                'font-sans text-sm font-semibold',
                filters.category === category && 'text-primary',
              )}
            >
              {category}
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => navigate({ category, difficulty: null })}
                  className="rounded-md py-2 pl-6 pr-3 text-left text-sm text-on-surface-variant transition-colors hover:bg-accent"
                >
                  All levels
                </button>
                {DIFFICULTIES.map((difficulty) => {
                  const difficultyActive =
                    filters.category === category && filters.difficulty === difficulty;
                  return (
                    <button
                      key={difficulty}
                      type="button"
                      aria-label={`${difficulty} in ${category}`}
                      onClick={() =>
                        difficultyActive
                          ? navigate({ difficulty: null })
                          : navigate({ category, difficulty })
                      }
                      className={cn(
                        'rounded-md py-2 pl-6 pr-3 text-left text-sm transition-colors hover:bg-accent',
                        difficultyActive ? 'text-primary' : 'text-on-surface-variant',
                      )}
                    >
                      {difficulty}
                    </button>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {isActive && (
        <Button
          variant="secondary"
          onClick={() => navigate({ category: null, difficulty: null, resetSearch: true })}
          className="w-full"
        >
          <X className="h-4 w-4" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
