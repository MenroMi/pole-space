'use client';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';
import { Difficulty, PoleType } from '@/shared/types/enums';

import type { MoveFilters } from '../types';

const POLE_TYPES = Object.values(PoleType);
const DIFFICULTIES = Object.values(Difficulty);

const capitalize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

type CatalogFiltersProps = {
  filters: MoveFilters;
  availableTags: { id: string; name: string }[];
};

export default function CatalogFilters({ filters, availableTags }: CatalogFiltersProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(filters.search ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedPoleTypes = filters.poleType ?? [];
  const selectedDifficulties = filters.difficulty ?? [];
  const selectedTags = filters.tags ?? [];

  const navigate = (overrides: {
    poleType?: PoleType[];
    difficulty?: Difficulty[];
    tags?: string[];
    resetSearch?: boolean;
  }) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const nextPoleType = 'poleType' in overrides ? overrides.poleType! : selectedPoleTypes;
    const nextDifficulty = 'difficulty' in overrides ? overrides.difficulty! : selectedDifficulties;
    const nextTags = 'tags' in overrides ? overrides.tags! : selectedTags;
    const nextSearch = overrides.resetSearch ? '' : searchValue;

    if (overrides.resetSearch) setSearchValue('');

    const parts: string[] = [];
    if (nextPoleType.length) parts.push(`poleType=${nextPoleType.join(',')}`);
    if (nextDifficulty.length) parts.push(`difficulty=${nextDifficulty.join(',')}`);
    if (nextTags.length) parts.push(`tags=${nextTags.join(',')}`);
    if (nextSearch) parts.push(`search=${encodeURIComponent(nextSearch)}`);
    const query = parts.join('&');
    router.replace(`/catalog${query ? `?${query}` : ''}`);
  };

  const togglePoleType = (value: PoleType) => {
    const next = selectedPoleTypes.includes(value)
      ? selectedPoleTypes.filter((v) => v !== value)
      : [...selectedPoleTypes, value];
    navigate({ poleType: next });
  };

  const toggleDifficulty = (value: Difficulty) => {
    const next = selectedDifficulties.includes(value)
      ? selectedDifficulties.filter((v) => v !== value)
      : [...selectedDifficulties, value];
    navigate({ difficulty: next });
  };

  const toggleTag = (id: string) => {
    const next = selectedTags.includes(id)
      ? selectedTags.filter((v) => v !== id)
      : [...selectedTags, id];
    navigate({ tags: next });
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const parts: string[] = [];
      if (selectedPoleTypes.length) parts.push(`poleType=${selectedPoleTypes.join(',')}`);
      if (selectedDifficulties.length) parts.push(`difficulty=${selectedDifficulties.join(',')}`);
      if (selectedTags.length) parts.push(`tags=${selectedTags.join(',')}`);
      if (value) parts.push(`search=${encodeURIComponent(value)}`);
      const query = parts.join('&');
      router.replace(`/catalog${query ? `?${query}` : ''}`);
    }, 300);
  };

  const isActive =
    selectedPoleTypes.length > 0 ||
    selectedDifficulties.length > 0 ||
    selectedTags.length > 0 ||
    !!filters.search;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search moves"
          placeholder="Search moves..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pr-9 pl-9"
        />
        {searchValue && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => navigate({ resetSearch: true })}
            className="absolute top-1/2 right-2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Accordion
        type="multiple"
        defaultValue={['pole-state', 'difficulty', 'tags']}
        aria-label="Catalog filters"
        className="w-full"
      >
        <AccordionItem value="pole-state">
          <AccordionTrigger className="font-sans text-sm font-semibold">
            Pole state
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-0.5">
              {POLE_TYPES.map((type) => {
                const active = selectedPoleTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    aria-label={capitalize(type)}
                    aria-pressed={active}
                    onClick={() => togglePoleType(type)}
                    className={cn(
                      'rounded-md py-2 pr-3 pl-6 text-left text-sm transition-colors hover:bg-accent',
                      active ? 'text-primary' : 'text-on-surface-variant',
                    )}
                  >
                    {capitalize(type)}
                  </button>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="difficulty">
          <AccordionTrigger className="font-sans text-sm font-semibold">
            Difficulty
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-0.5">
              {DIFFICULTIES.map((diff) => {
                const active = selectedDifficulties.includes(diff);
                return (
                  <button
                    key={diff}
                    type="button"
                    aria-label={capitalize(diff)}
                    aria-pressed={active}
                    onClick={() => toggleDifficulty(diff)}
                    className={cn(
                      'rounded-md py-2 pr-3 pl-6 text-left text-sm transition-colors hover:bg-accent',
                      active ? 'text-primary' : 'text-on-surface-variant',
                    )}
                  >
                    {capitalize(diff)}
                  </button>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {availableTags.length > 0 && (
          <AccordionItem value="tags">
            <AccordionTrigger className="font-sans text-sm font-semibold">Tags</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-0.5">
                {availableTags.map((tag) => {
                  const active = selectedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-label={tag.name}
                      aria-pressed={active}
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        'rounded-md py-2 pr-3 pl-6 text-left text-sm transition-colors hover:bg-accent',
                        active ? 'text-primary' : 'text-on-surface-variant',
                      )}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {isActive && (
        <Button
          variant="secondary"
          onClick={() => navigate({ poleType: [], difficulty: [], tags: [], resetSearch: true })}
          className="w-full"
        >
          <X className="h-4 w-4" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
