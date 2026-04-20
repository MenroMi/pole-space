'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Category, Difficulty } from '@prisma/client'
import type { MoveFilters } from '../types'

const CATEGORIES = Object.values(Category)
const DIFFICULTIES = Object.values(Difficulty)

interface CatalogFiltersProps {
  filters: MoveFilters
}

export default function CatalogFilters({ filters }: CatalogFiltersProps) {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState(filters.search ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Single source of truth for URL updates. Cancels any pending debounce so a
  // stale timer cannot overwrite the URL after a direct click. Each override
  // key uses `'key' in overrides` semantics: if omitted, keep the current
  // value from filters; if present (even as null), apply the override.
  const navigate = (overrides: {
    category?: Category | null
    difficulty?: Difficulty | null
    resetSearch?: boolean
  }) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    const nextCategory =
      'category' in overrides ? overrides.category : filters.category
    const nextDifficulty =
      'difficulty' in overrides ? overrides.difficulty : filters.difficulty
    const nextSearch = overrides.resetSearch ? '' : searchValue

    if (overrides.resetSearch) setSearchValue('')

    const params = new URLSearchParams()
    if (nextCategory) params.set('category', nextCategory)
    if (nextDifficulty) params.set('difficulty', nextDifficulty)
    if (nextSearch) params.set('search', nextSearch)
    const query = params.toString()
    router.replace(`/catalog${query ? `?${query}` : ''}`)
  }

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      // `navigate({})` reads current searchValue from closure.
      // We can't use navigate() here directly because `searchValue` closure would be stale;
      // instead inline the URL build using the fresh value.
      const params = new URLSearchParams()
      if (filters.category) params.set('category', filters.category)
      if (filters.difficulty) params.set('difficulty', filters.difficulty)
      if (value) params.set('search', value)
      const query = params.toString()
      router.replace(`/catalog${query ? `?${query}` : ''}`)
    }, 300)
  }

  const isActive = !!filters.category || !!filters.difficulty || !!filters.search

  return (
    <div className="p-4 flex flex-col gap-4">
      <input
        type="text"
        aria-label="Search moves"
        placeholder="Search moves..."
        value={searchValue}
        onChange={e => handleSearchChange(e.target.value)}
        className="w-full bg-surface-high rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant"
      />

      <nav aria-label="Filter by category" className="flex flex-col gap-1">
        {CATEGORIES.map(category => (
          <div key={category}>
            <button
              type="button"
              onClick={() => navigate({ category, difficulty: null })}
              className={`w-full text-left py-1.5 text-sm font-semibold font-sans ${
                filters.category === category ? 'text-primary' : 'text-on-surface'
              }`}
            >
              {category}
            </button>
            <div className="pl-4 flex flex-col">
              {DIFFICULTIES.map(difficulty => (
                <button
                  key={difficulty}
                  type="button"
                  aria-label={`${difficulty} in ${category}`}
                  onClick={() => navigate({ category, difficulty })}
                  className={`text-left py-1 text-sm ${
                    filters.category === category && filters.difficulty === difficulty
                      ? 'text-primary'
                      : 'text-on-surface-variant'
                  }`}
                >
                  {difficulty}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {isActive && (
        <button
          type="button"
          onClick={() =>
            navigate({ category: null, difficulty: null, resetSearch: true })
          }
          className="text-sm text-on-surface-variant underline text-left"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
