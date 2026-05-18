'use client';
import { Check, Gauge, RotateCw, Search, SlidersHorizontal, Tag, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useRouter } from '@/i18n/navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import type { LocalizedTag } from '@/shared/lib/localize';
import { cn } from '@/shared/lib/utils';
import type { MoveFilters } from '@/shared/types';
import { Difficulty, PoleType } from '@/shared/types/enums';

const POLE_TYPES = Object.values(PoleType);
const DIFFICULTIES = Object.values(Difficulty);

function buildQuery(
  poleType: PoleType[],
  difficulty: Difficulty[],
  tags: string[],
  search: string,
): string {
  const parts: string[] = [];
  // URL param stays `poleType` (without 's') for stable public URLs; server reads it the same way
  if (poleType.length) parts.push(`poleType=${poleType.join(',')}`);
  if (difficulty.length) parts.push(`difficulty=${difficulty.join(',')}`);
  if (tags.length) parts.push(`tags=${tags.map(encodeURIComponent).join(',')}`);
  if (search) parts.push(`search=${encodeURIComponent(search)}`);
  return parts.join('&');
}

type CatalogFiltersProps = {
  filters: MoveFilters;
  availableTags: LocalizedTag[];
  mode?: 'sidebar' | 'trigger';
};

export default function CatalogFilters({
  filters,
  availableTags,
  mode = 'sidebar',
}: CatalogFiltersProps) {
  const t = useTranslations('catalog.filters');
  const te = useTranslations('enums');
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(filters.search ?? '');
  const [sheetOpen, setSheetOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedPoleTypes = filters.poleTypes ?? [];
  const selectedDifficulties = filters.difficulty ?? [];
  const selectedTags = filters.tags ?? [];

  const navigate = (overrides: {
    poleTypes?: PoleType[];
    difficulty?: Difficulty[];
    tags?: string[];
    resetSearch?: boolean;
  }) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const nextPoleType = 'poleTypes' in overrides ? overrides.poleTypes! : selectedPoleTypes;
    const nextDifficulty = 'difficulty' in overrides ? overrides.difficulty! : selectedDifficulties;
    const nextTags = 'tags' in overrides ? overrides.tags! : selectedTags;
    const nextSearch = overrides.resetSearch ? '' : searchValue;

    if (overrides.resetSearch) setSearchValue('');

    const query = buildQuery(nextPoleType, nextDifficulty, nextTags, nextSearch);
    router.replace(`/catalog${query ? `?${query}` : ''}`);
  };

  const togglePoleType = (value: PoleType) => {
    const next = selectedPoleTypes.includes(value)
      ? selectedPoleTypes.filter((v) => v !== value)
      : [...selectedPoleTypes, value];
    navigate({ poleTypes: next });
  };

  const toggleDifficulty = (value: Difficulty) => {
    const next = selectedDifficulties.includes(value)
      ? selectedDifficulties.filter((v) => v !== value)
      : [...selectedDifficulties, value];
    navigate({ difficulty: next });
  };

  const toggleTag = (name: string) => {
    const next = selectedTags.includes(name)
      ? selectedTags.filter((v) => v !== name)
      : [...selectedTags, name];
    navigate({ tags: next });
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const query = buildQuery(selectedPoleTypes, selectedDifficulties, selectedTags, value);
      router.replace(`/catalog${query ? `?${query}` : ''}`);
    }, 300);
  };

  const isActive =
    selectedPoleTypes.length > 0 ||
    selectedDifficulties.length > 0 ||
    selectedTags.length > 0 ||
    !!filters.search;

  const activeCount = selectedPoleTypes.length + selectedDifficulties.length + selectedTags.length;

  const searchInput = (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label={t('searchLabel')}
        placeholder={t('search')}
        value={searchValue}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="pr-9 pl-9"
      />
      {searchValue && (
        <button
          type="button"
          aria-label={t('clearSearch')}
          onClick={() => navigate({ resetSearch: true })}
          className="absolute top-1/2 right-2 inline-flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const filterBody = (
    <>
      <Accordion
        type="multiple"
        defaultValue={['pole-state', 'difficulty', 'tags']}
        aria-label={t('label')}
        className="w-full"
      >
        <AccordionItem value="pole-state">
          <AccordionTrigger
            className={cn(
              'group cursor-pointer font-sans text-sm font-bold',
              selectedPoleTypes.length > 0 && 'text-primary',
            )}
          >
            <span className="flex items-center gap-2">
              <RotateCw className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              {t('poleState')}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-0.5 pt-3">
              {POLE_TYPES.map((type) => {
                const active = selectedPoleTypes.includes(type);
                const label = te(`poleType.${type}`);
                return (
                  <button
                    key={type}
                    type="button"
                    aria-label={label}
                    aria-pressed={active}
                    onClick={() => togglePoleType(type)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2 rounded-md py-2 pr-3 pl-3 text-left text-sm transition-colors hover:bg-accent',
                      active ? 'bg-primary/10 text-primary' : 'text-on-surface-variant',
                    )}
                  >
                    <Check
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 transition-opacity',
                        active ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {label}
                  </button>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="difficulty">
          <AccordionTrigger
            className={cn(
              'group cursor-pointer font-sans text-sm font-bold',
              selectedDifficulties.length > 0 && 'text-primary',
            )}
          >
            <span className="flex items-center gap-2">
              <Gauge className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              {t('difficulty')}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-0.5 pt-3">
              {DIFFICULTIES.map((diff) => {
                const active = selectedDifficulties.includes(diff);
                const label = te(`difficulty.${diff}`);
                return (
                  <button
                    key={diff}
                    type="button"
                    aria-label={label}
                    aria-pressed={active}
                    onClick={() => toggleDifficulty(diff)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2 rounded-md py-2 pr-3 pl-3 text-left text-sm transition-colors hover:bg-accent',
                      active ? 'bg-primary/10 text-primary' : 'text-on-surface-variant',
                    )}
                  >
                    <Check
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 transition-opacity',
                        active ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {label}
                  </button>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {availableTags.length > 0 && (
          <AccordionItem value="tags">
            <AccordionTrigger
              className={cn(
                'group cursor-pointer font-sans text-sm font-bold',
                selectedTags.length > 0 && 'text-primary',
              )}
            >
              <span className="flex items-center gap-2">
                <Tag className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12" />
                {t('tags')}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-1.5 px-1 pt-3 pb-1">
                {availableTags.map((tag) => {
                  const active = selectedTags.includes(tag.name);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-label={tag.name}
                      aria-pressed={active}
                      onClick={() => toggleTag(tag.name)}
                      className={cn(
                        'cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-all',
                        !active && 'bg-accent/70 text-muted-foreground hover:bg-accent',
                      )}
                      style={
                        active && tag.color
                          ? { backgroundColor: `${tag.color}28`, color: tag.color }
                          : undefined
                      }
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
          onClick={() => navigate({ poleTypes: [], difficulty: [], tags: [], resetSearch: true })}
          className="w-full"
        >
          <X className="h-4 w-4" />
          {t('clearFilters')}
        </Button>
      )}
    </>
  );

  const filterContent = (
    <>
      {searchInput}
      {filterBody}
    </>
  );

  if (mode === 'trigger') {
    return (
      <>
        {/* Search + filter button row — always visible on mobile */}
        <div className="flex gap-2">
          <div className="flex flex-1 items-center gap-[9px] rounded-[10px] border border-outline-variant/20 bg-surface-container px-[13px] py-[9px]">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              type="text"
              aria-label={t('searchLabel')}
              placeholder={t('search')}
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="min-w-0 flex-1 bg-transparent font-sans text-[13px] text-on-surface outline-none placeholder:text-muted-foreground"
            />
            {searchValue && (
              <button
                type="button"
                aria-label={t('clearSearch')}
                onClick={() => navigate({ resetSearch: true })}
                className="shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-on-surface"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label={t('label')}
            className="relative flex shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-outline-variant/20 bg-surface-container text-on-surface-variant transition-colors hover:border-outline-variant hover:text-on-surface"
            style={{
              width: 42,
              height: 42,
              ...(activeCount > 0
                ? { borderColor: 'rgba(220,184,255,0.4)', color: '#dcb8ff' }
                : {}),
            }}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-on-primary">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {sheetOpen &&
          createPortal(
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-[60] bg-black/60"
                onClick={() => setSheetOpen(false)}
              />
              {/* Sheet */}
              <div
                className="fixed inset-x-0 bottom-0 z-[61] flex max-h-[85dvh] flex-col rounded-t-[20px] border border-b-0 border-outline-variant/40"
                style={{
                  background: '#171717',
                  animation: 'slideUp 280ms cubic-bezier(0.16,1,0.3,1) both',
                }}
              >
                {/* Handle + sticky header */}
                <div
                  className="sticky top-0 z-10 shrink-0 rounded-t-[20px]"
                  style={{ background: '#171717' }}
                >
                  <div className="flex justify-center pt-3 pb-[14px]">
                    <div
                      style={{
                        width: 40,
                        height: 4,
                        borderRadius: 2,
                        background: 'rgba(75,68,80,0.5)',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between px-5 pb-[18px]">
                    <div className="flex items-center gap-3">
                      <span className="font-display text-[18px] font-semibold text-on-surface">
                        {t('sheetTitle')}
                      </span>
                      {activeCount > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-on-primary">
                          {activeCount}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSheetOpen(false)}
                      aria-label="Close filters"
                      className="cursor-pointer border-0 bg-transparent text-on-surface-variant transition-colors hover:text-on-surface"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Scrollable filter content */}
                <div className="flex-1 overflow-y-auto px-5 pb-2">{filterBody}</div>

                {/* Fixed bottom — apply button */}
                <div className="shrink-0 px-5 pt-3 pb-6" style={{ background: '#171717' }}>
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    className="w-full cursor-pointer rounded-lg border-0 font-sans text-[12px] font-bold tracking-[0.1em] uppercase"
                    style={{
                      padding: '14px 20px',
                      background:
                        'linear-gradient(135deg, #dcb8ff, #8458b3, #dcb8ff) 0% 0% / 200% 200%',
                      color: '#ffffff',
                      boxShadow: 'rgba(132,88,179,0.4) 0px 4px 16px -2px',
                    }}
                  >
                    {t('applyFilters')}
                  </button>
                </div>
              </div>
            </>,
            document.body,
          )}
      </>
    );
  }

  return <div className="flex flex-col gap-4 p-4">{filterContent}</div>;
}
